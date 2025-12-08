<script lang="ts">
	import { Menu, X } from 'lucide-svelte';

	interface Props {
		onClick: () => void;
		isOpen?: boolean;
	}

	let { onClick, isOpen = false }: Props = $props();

	function handleClick(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		onClick();
	}
</script>

<button
	onclick={handleClick}
	class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
	title={isOpen ? 'Close Menu' : 'Open Menu'}
	type="button"
>
	{#if isOpen}
		<X size={20} class="text-gray-700" />
	{:else}
		<Menu size={20} class="text-gray-700" />
	{/if}
</button>
