<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SidebarMenu from '$lib/components/SidebarMenu.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	// Global user state
	let userId = $state<string | null>(null);
	let userName = $state<string | null>(null);
	let sidebarOpen = $state(false);

	// Set context so child components can access user state
	setContext('user', {
		get userId() {
			return userId;
		},
		get userName() {
			return userName;
		},
		set userId(value) {
			userId = value;
		},
		set userName(value) {
			userName = value;
		}
	});

	// Check authentication on mount
	onMount(() => {
		const storedUserId = localStorage.getItem('scavenger-hunt-userId');

		if (storedUserId) {
			userId = storedUserId;
			// Fetch user name from API
			fetchUserName(storedUserId);
		} else if (page.route.id !== '/login') {
			// Redirect to login if not authenticated and not already on login page
			goto('/login');
		}
	});

	async function fetchUserName(id: string) {
		try {
			const response = await fetch(`/api/users/${id}`);
			if (response.ok) {
				const data = await response.json();
				userName = data.user.name;
			}
		} catch (error) {
			console.error('Failed to fetch user name:', error);
		}
	}

	// Reactive check for route changes
	$effect(() => {
		if (!userId && page.route.id !== '/login') {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Sidebar Menu - only show if user is authenticated and not on login page -->
{#if userId && page.route.id !== '/login'}
	<SidebarMenu onClick={() => (sidebarOpen = true)} />
{/if}

{@render children()}

<!-- Sidebar - only show if user is authenticated -->
{#if userId && userName}
	<Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} {userName} />
{/if}
