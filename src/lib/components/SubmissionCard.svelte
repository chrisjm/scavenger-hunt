<script lang="ts">
	interface Submission {
		id: string;
		userName: string;
		taskDescription: string;
		imagePath: string;
		valid: boolean;
		aiReasoning: string;
		aiConfidence: number;
		submittedAt: string;
	}

	interface Props {
		submission: Submission;
	}

	let { submission }: Props = $props();
</script>

<div
	class="group border-2 rounded-xl p-5 transition-all duration-300 hover:shadow-md {submission.valid
		? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:border-green-300'
		: 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50 hover:border-red-300'}"
>
	<div class="flex items-start gap-4">
		<div class="relative">
			<img
				src={submission.imagePath}
				alt="Submission"
				class="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm group-hover:shadow-md transition-shadow"
			/>
			<div class="absolute -top-2 -right-2">
				<div
					class="w-6 h-6 rounded-full flex items-center justify-center {submission.valid
						? 'bg-green-500'
						: 'bg-red-500'}"
				>
					<span class="text-white text-xs">
						{submission.valid ? '✓' : '✗'}
					</span>
				</div>
			</div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-2 flex-wrap">
				<span class="font-bold text-gray-800">{submission.userName || 'Anonymous'}</span>
				<span class="text-sm text-gray-500">found</span>
				<span class="font-medium text-gray-700">"{submission.taskDescription}"</span>
				<div class="ml-auto">
					<span
						class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full {submission.valid
							? 'bg-green-100 text-green-800 border border-green-200'
							: 'bg-red-100 text-red-800 border border-red-200'}"
					>
						<span>{submission.valid ? '✅' : '❌'}</span>
						<span>{submission.valid ? 'Approved' : 'Rejected'}</span>
					</span>
				</div>
			</div>

			<div class="bg-white/60 rounded-lg p-3 mb-2">
				<p class="text-sm text-gray-700 italic leading-relaxed">
					<span class="font-medium text-gray-600">AI Judge:</span>
					"{submission.aiReasoning}"
				</p>
			</div>

			<div class="flex items-center justify-between text-xs text-gray-500">
				<span class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full bg-blue-400"></span>
					<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
				</span>
				<span>{new Date(submission.submittedAt).toLocaleTimeString()}</span>
			</div>
		</div>
	</div>
</div>
