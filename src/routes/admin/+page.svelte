<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto max-w-4xl">
		<div class="mb-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<h1 class="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin Dashboard</h1>
			<p class="mt-2 text-sm text-gray-600 dark:text-slate-300">
				Manage groups, tasks, and other administrative areas.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<button
				type="button"
				onclick={() => goto(resolve('/groups/select'))}
				class="rounded-2xl bg-white p-6 text-left shadow-xl transition-transform hover:scale-[1.01] dark:bg-slate-900"
			>
				<div class="text-lg font-semibold text-gray-800 dark:text-slate-100">Groups</div>
				<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
					Create groups and select the active group.
				</div>
			</button>

			<button
				type="button"
				onclick={() => goto(resolve('/admin/tasks'))}
				class="rounded-2xl bg-white p-6 text-left shadow-xl transition-transform hover:scale-[1.01] dark:bg-slate-900"
			>
				<div class="text-lg font-semibold text-gray-800 dark:text-slate-100">Tasks</div>
				<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
					Create, update, and retire tasks.
				</div>
			</button>
		</div>
	</div>
</div>
