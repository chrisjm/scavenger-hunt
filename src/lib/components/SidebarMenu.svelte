<script lang="ts">
	import { Menu } from 'lucide-svelte';

	interface Props {
		onClick: () => void;
	}

	let { onClick }: Props = $props();
</script>

<button
	onclick={onClick}
	class="fixed top-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hover:scale-105"
	title="Open Menu"
>
	<Menu size={20} class="text-gray-700" />
</button>
