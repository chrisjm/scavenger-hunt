<script lang="ts">
	interface Props {
		loading: boolean;
		totalTasks: number;
		unlockedTasks: number;
		completionRate: number;
		approvedSubmissions: number;
		totalSubmissions: number;
	}

	let {
		loading,
		totalTasks,
		unlockedTasks,
		completionRate,
		approvedSubmissions,
		totalSubmissions
	}: Props = $props();
</script>

{#if !loading && totalTasks > 0}
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
		<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-2xl">🎯</span>
				<span class="text-sm font-medium text-gray-600">Available Tasks</span>
			</div>
			<div class="text-2xl font-bold text-green-600">{unlockedTasks}</div>
			<div class="text-xs text-gray-500">of {totalTasks} total</div>
		</div>

		<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-2xl">📈</span>
				<span class="text-sm font-medium text-gray-600">Progress</span>
			</div>
			<div class="text-2xl font-bold text-blue-600">{completionRate}%</div>
			<div class="w-full bg-gray-200 rounded-full h-2 mt-1">
				<div
					class="bg-blue-600 h-2 rounded-full transition-all duration-500"
					style="width: {completionRate}%"
				></div>
			</div>
		</div>

		<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-2xl">✅</span>
				<span class="text-sm font-medium text-gray-600">Approved</span>
			</div>
			<div class="text-2xl font-bold text-emerald-600">{approvedSubmissions}</div>
			<div class="text-xs text-gray-500">submissions</div>
		</div>

		<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
			<div class="flex items-center gap-2 mb-2">
				<span class="text-2xl">📡</span>
				<span class="text-sm font-medium text-gray-600">Total Activity</span>
			</div>
			<div class="text-2xl font-bold text-purple-600">{totalSubmissions}</div>
			<div class="text-xs text-gray-500">submissions</div>
		</div>
	</div>
{/if}
