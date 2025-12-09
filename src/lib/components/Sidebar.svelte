<script lang="ts">
	import { User, Camera, LogOut, X, Home, ListChecks } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { getUserContext } from '$lib/stores/user';
	import GroupSelector from '$lib/components/GroupSelector.svelte';

	const userContext = getUserContext();
	const isAdmin = $derived(userContext.isAdmin);

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		userName: string | null;
	}

	let { isOpen, onClose, userName }: Props = $props();

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			console.error('Logout failed', error);
		}

		localStorage.removeItem('scavenger-hunt-userId');
		userContext.userId = null;
		userContext.userName = null;
		userContext.setActiveGroup(null);
		onClose();
		goto('/');
	}

	function handleNavigation(path: string) {
		goto(path);
		onClose();
	}
</script>

<!-- Backdrop -->
{#if isOpen}
	<button
		class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity cursor-default"
		onclick={onClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		}}
		aria-label="Close sidebar"
		type="button"
	></button>
{/if}

<!-- Sidebar -->
<div
	class="fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 {isOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div class="flex items-center justify-between p-6 border-b border-gray-200">
			<h2 class="text-xl font-bold text-gray-800">Menu</h2>
			<button onclick={onClose} class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
				<X size={20} class="text-gray-600" />
			</button>
		</div>

		<!-- Profile Section -->
		{#if userName}
			<div class="p-6 border-b border-gray-200 space-y-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-lg font-bold text-white"
					>
						{userName.charAt(0).toUpperCase()}
					</div>
					<div>
						<h3 class="font-semibold text-gray-800">{userName}</h3>
						<p class="text-sm text-gray-500">Player</p>
					</div>
				</div>

				{#if isAdmin}
					<div class="mt-2">
						<GroupSelector />
					</div>
				{/if}
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 p-6">
			<div class="space-y-2">
				<button
					onclick={() => handleNavigation('/')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
				>
					<Home size={20} class="text-gray-600" />
					<span class="font-medium text-gray-700">Home</span>
				</button>

				<button
					onclick={() => handleNavigation('/tasks')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
				>
					<ListChecks size={20} class="text-gray-600" />
					<span class="font-medium text-gray-700">Tasks</span>
				</button>

				<button
					onclick={() => handleNavigation('/submissions')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
				>
					<ListChecks size={20} class="text-gray-600" />
					<span class="font-medium text-gray-700">Submissions</span>
				</button>

				<button
					onclick={() => handleNavigation('/profile')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
				>
					<User size={20} class="text-gray-600" />
					<span class="font-medium text-gray-700">Edit Profile</span>
				</button>

				<button
					onclick={() => handleNavigation('/library')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
				>
					<Camera size={20} class="text-gray-600" />
					<span class="font-medium text-gray-700">My Library</span>
				</button>
			</div>
		</nav>

		<!-- Logout -->
		<div class="p-6 border-t border-gray-200">
			<button
				onclick={handleLogout}
				class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left group"
			>
				<LogOut size={20} class="text-red-600" />
				<span class="font-medium text-red-600">Logout</span>
			</button>
		</div>
	</div>
</div>
