<script lang="ts">
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	const userGroups = $derived(userContext.userGroups);
	const activeGroupId = $derived(userContext.activeGroupId);
	const isAdmin = $derived(userContext.isAdmin);

	// Local selector value (string), kept in sync with activeGroupId
	let selectorValue = $state<string>('');

	$effect(() => {
		selectorValue = activeGroupId ?? '';
	});

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value || null;
		userContext.setActiveGroup(value);
	}
</script>

<div class="flex items-center gap-3">
	<div class="flex flex-col">
		<label for="group-selector" class="text-xs font-semibold text-gray-600">Active group</label>
		<select
			id="group-selector"
			class="min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
			onchange={handleChange}
			bind:value={selectorValue}
		>
			{#if userGroups.length === 0}
				<option value={null}>No groups</option>
			{:else}
				{#each userGroups as group}
					<option value={group.id}>{group.name}</option>
				{/each}
			{/if}
		</select>
	</div>
	{#if isAdmin}
		<div
			class="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600"
		>
			<span class="text-gray-500">Admin</span>
		</div>
	{/if}
</div>
