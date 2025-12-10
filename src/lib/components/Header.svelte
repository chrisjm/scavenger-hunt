<script lang="ts">
	import { TreePine } from 'lucide-svelte';
	import SidebarMenu from './SidebarMenu.svelte';

	interface Props {
		sidebarOpen: boolean;
		onMenuClick: () => void;
		showMenu?: boolean;
		showGroupSelector?: boolean;
		groupSelector?: () => any;
	}

	let {
		sidebarOpen,
		onMenuClick,
		showMenu = true,
		showGroupSelector = false,
		groupSelector
	}: Props = $props();
</script>

<header
	class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800"
>
	<div class="flex items-center justify-between px-4 py-3">
		<!-- Left: App Title -->
		<div class="flex items-center gap-2">
			<TreePine class="text-green-600" size={24} />
			<h1 class="text-lg font-bold text-gray-800 md:text-xl dark:text-slate-100">
				<span
					class="bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent"
				>
					Scavenger Hunt
				</span>
			</h1>
		</div>

		<!-- Right: Group selector (desktop) and Menu Button -->
		<div class="flex items-center gap-3">
			{#if showGroupSelector && groupSelector}
				<div class="hidden md:block">
					{@render groupSelector()}
				</div>
			{/if}

			{#if showMenu}
				<SidebarMenu isOpen={sidebarOpen} onClick={onMenuClick} />
			{/if}
		</div>
	</div>
</header>
