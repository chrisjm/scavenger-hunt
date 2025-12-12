<script lang="ts">
	import { TrendingUp, CheckCircle, Activity } from 'lucide-svelte';

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
	<div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
		<div
			class="bg-white rounded-xl p-4 shadow-md border border-gray-100 col-span-2 lg:col-span-1 dark:bg-slate-900 dark:border-slate-700"
		>
			<div class="flex items-center gap-2 mb-2">
				<TrendingUp size={20} class="text-blue-600 dark:text-blue-400" />
				<span class="text-sm font-medium text-gray-600 dark:text-slate-300">Progress</span>
			</div>
			<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{completionRate}%</div>
			<div class="mt-1 text-xs text-gray-500 dark:text-slate-400">{unlockedTasks} unlocked</div>
			<div class="w-full bg-gray-200 rounded-full h-2 mt-1 dark:bg-slate-700">
				<div
					class="bg-blue-600 h-2 rounded-full transition-all duration-500 dark:bg-blue-500"
					style="width: {completionRate}%"
				></div>
			</div>
		</div>

		<div
			class="bg-white rounded-xl p-4 shadow-md border border-gray-100 dark:bg-slate-900 dark:border-slate-700"
		>
			<div class="flex items-center gap-2 mb-2">
				<CheckCircle size={20} class="text-emerald-600 dark:text-emerald-400" />
				<span class="text-sm font-medium text-gray-600 dark:text-slate-300">Approved</span>
			</div>
			<div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
				{approvedSubmissions}
			</div>
			<div class="text-xs text-gray-500 dark:text-slate-400">submissions</div>
		</div>

		<div
			class="bg-white rounded-xl p-4 shadow-md border border-gray-100 dark:bg-slate-900 dark:border-slate-700"
		>
			<div class="flex items-center gap-2 mb-2">
				<Activity size={20} class="text-purple-600 dark:text-purple-400" />
				<span class="text-sm font-medium text-gray-600 dark:text-slate-300">Total Activity</span>
			</div>
			<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalSubmissions}</div>
			<div class="text-xs text-gray-500 dark:text-slate-400">submissions</div>
		</div>
	</div>
{/if}
