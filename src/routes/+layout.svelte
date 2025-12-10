<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { GroupSummary } from '$lib/stores/user';
	import GroupSelector from '$lib/components/GroupSelector.svelte';

	let { children } = $props();

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
			if (id) {
				localStorage.setItem('scavenger-hunt-activeGroupId', id);
			} else {
				localStorage.removeItem('scavenger-hunt-activeGroupId');
			}
		},
		refreshGroups
	});

	function isPublicRoute(routeId: string | null) {
		return routeId === '/' || routeId === '/login' || routeId === '/register';
	}

	// Check authentication on mount
	onMount(() => {
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
				// Resolve active group: prefer stored if still valid, else first available
				const storedActive = localStorage.getItem('scavenger-hunt-activeGroupId');
				const validStored = groups.find((g: GroupSummary) => g.id === storedActive);
				if (validStored) {
					activeGroupId = validStored.id;
				} else if (groups.length > 0) {
					activeGroupId = groups[0].id;
					localStorage.setItem('scavenger-hunt-activeGroupId', groups[0].id);
				} else {
					activeGroupId = null;
					localStorage.removeItem('scavenger-hunt-activeGroupId');
				}
			}
		} catch (error) {
			console.error('Failed to fetch user groups:', error);
		}
	}

	// Reactive check for route changes
	$effect(() => {
		if (!userId && !isPublicRoute(page.route.id)) {
			goto('/login');
		} else if (userId && page.route.id === '/') {
			goto('/tasks');
		}
	});
</script>

<svelte:head>
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
		showGroupSelector={!!userId && userGroups.length > 0 && !!isAdmin}
		groupSelector={GroupSelector as any}
	/>
{/if}

{@render children()}

<!-- Sidebar - only show if user is authenticated -->
{#if userId}
	<Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} {userName} />
{/if}
