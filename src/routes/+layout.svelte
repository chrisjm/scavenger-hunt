<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import {
		type GroupSummary,
		userGroupsStore,
		activeGroupIdStore,
		setActiveGroup as setActiveGroupStore,
		resetGroupStores
	} from '$lib/stores/user';

	let { children, data } = $props();

	// Global user state
	let userId = $state<string | null>(null);
	let userName = $state<string | null>(null);
	let isAdmin = $state<boolean | null>(null);
	let userGroups = $state<GroupSummary[]>([]);
	let activeGroupId = $state<string | null>(null);
	let sidebarOpen = $state(false);

	// Set context so child components can access user state
	setContext('user', {
		get userId() {
			return userId;
		},
		get userName() {
			return userName;
		},
		get isAdmin() {
			return isAdmin;
		},
		get userGroups() {
			return userGroups;
		},
		get activeGroupId() {
			return activeGroupId;
		},
		set userId(value) {
			userId = value;
		},
		set userName(value) {
			userName = value;
		},
		set isAdmin(value) {
			isAdmin = value;
		},
		setActiveGroup(id: string | null) {
			activeGroupId = id;
			setActiveGroupStore(id);
		},
		refreshGroups,
		resetGroups() {
			resetGroupStores();
			activeGroupId = null;
			userGroups = [];
		}
	});

	function isPublicRoute(routeId: string | null) {
		return routeId === '/' || routeId === '/login' || routeId === '/register';
	}

	// Check authentication on mount
	onMount(() => {
		const unsubGroups = userGroupsStore.subscribe((groups) => {
			userGroups = groups;
		});
		const unsubActive = activeGroupIdStore.subscribe((id) => {
			activeGroupId = id;
		});

		const storedUserId = localStorage.getItem('scavenger-hunt-userId');

		if (storedUserId) {
			userId = storedUserId;
			// Fetch user profile and groups from API
			fetchUserProfile(storedUserId);
			refreshGroups();
		} else if (!isPublicRoute(page.route.id)) {
			// Redirect unauthenticated users away from protected routes
			goto('/login');
		}

		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const applyTheme = () => {
			document.documentElement.classList.toggle('dark', media.matches);
		};

		applyTheme();
		media.addEventListener('change', applyTheme);

		return () => {
			media.removeEventListener('change', applyTheme);
			unsubGroups();
			unsubActive();
		};
	});

	async function fetchUserProfile(id: string) {
		try {
			const response = await fetch(`/api/users/${id}`);
			if (response.ok) {
				const data = await response.json();
				userName = data.user.name;
				isAdmin = data.user.isAdmin ?? false;
			}
		} catch (error) {
			console.error('Failed to fetch user profile:', error);
		}
	}

	async function refreshGroups() {
		if (!userId) return;
		try {
			const response = await fetch(`/api/groups/users/${userId}/groups`);
			if (response.ok) {
				const groups = await response.json();
				userGroups = groups;
				userGroupsStore.set(groups);
				// Resolve active group: prefer stored if still valid, else first available
				const storedActive = localStorage.getItem('scavenger-hunt-activeGroupId');
				const validStored = groups.find((g: GroupSummary) => g.id === storedActive);
				if (validStored) {
					activeGroupId = validStored.id;
					setActiveGroupStore(validStored.id);
				} else if (groups.length > 0) {
					activeGroupId = groups[0].id;
					setActiveGroupStore(groups[0].id);
				} else {
					activeGroupId = null;
					setActiveGroupStore(null);
				}
			}
		} catch (error) {
			console.error('Failed to fetch user groups:', error);
		}
	}

	// Reactive check for route changes
	$effect(() => {
		const routeId = page.route.id;

		if (!userId && !isPublicRoute(routeId)) {
			goto('/login');
			return;
		}

		// Force group selection when authenticated but no active group
		if (userId && !activeGroupId && routeId !== '/groups/select') {
			goto('/groups/select');
			return;
		}

		// If active group is ready but user is on selection page, send to tasks (non-admins only)
		if (userId && activeGroupId && routeId === '/groups/select' && isAdmin === false) {
			goto('/tasks');
			return;
		}

		// Authenticated and on landing -> tasks
		if (userId && routeId === '/') {
			goto('/tasks');
		}
	});

	// Prevent background scroll when sidebar is open
	$effect(() => {
		if (typeof window === 'undefined') return;
		document.body.style.overflow = sidebarOpen ? 'hidden' : '';
	});
</script>

<svelte:head>
	<title>{data?.seo?.title ?? 'Scavenger Hunt'}</title>
	<meta
		name="description"
		content={data?.seo?.description ??
			'Group-based scavenger hunt platform for teams, tasks and leaderboards.'}
	/>
	<meta property="og:type" content={data?.seo?.type ?? 'website'} />
	<meta property="og:site_name" content={data?.seo?.siteName ?? 'Scavenger Hunt'} />
	{#if data?.seo?.url}
		<link rel="canonical" href={data.seo.url} />
		<meta property="og:url" content={data.seo.url} />
	{/if}
	{#if data?.seo?.image}
		<meta property="og:image" content={data.seo.image} />
		<meta name="twitter:image" content={data.seo.image} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data?.seo?.title ?? 'Scavenger Hunt'} />
	<meta
		name="twitter:description"
		content={data?.seo?.description ??
			'Group-based scavenger hunt platform for teams, tasks and leaderboards.'}
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Header - show on all pages except auth screens -->
{#if page.route.id !== '/login' && page.route.id !== '/register'}
	<Header
		{sidebarOpen}
		onMenuClick={() => {
			sidebarOpen = !sidebarOpen;
		}}
		showMenu={!!userId}
	/>
{/if}

{@render children()}

<!-- Sidebar - only show if user is authenticated -->
{#if userId}
	<Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} {userName} />
{/if}
