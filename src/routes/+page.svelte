<script lang="ts">
	import { io, type Socket } from 'socket.io-client';

	let socket: Socket | undefined;
	let submissions = $state<any[]>([]);
	let selectedFile = $state<File | null>(null);
	let uploading = $state(false);
	let loading = $state(true);
	let userId = 'user-' + Math.random().toString(36).substr(2, 9);
	let tasks = $state<any[]>([]);

	$effect(() => {
		// Load tasks from API
		async function loadTasks() {
			try {
				const response = await fetch('/api/tasks');
				tasks = await response.json();
			} catch (error) {
				console.error('Failed to load tasks:', error);
			} finally {
				loading = false;
			}
		}

		loadTasks();

		// Connect to Socket.IO
		socket = io();

		socket.on('connect', () => {
			console.log('Connected to server');
			socket.emit('join-room', userId);
		});

		socket.on('new-submission', (submission: any) => {
			submissions = [submission, ...submissions];
		});

		return () => {
			socket?.disconnect();
		};
	});

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		selectedFile = target.files?.[0] || null;
	}

	async function uploadImage(taskId: number) {
		if (!selectedFile) {
			alert('Please select an image first');
			return;
		}

		uploading = true;
		const formData = new FormData();
		formData.append('image', selectedFile);
		formData.append('userId', userId);
		formData.append('taskId', taskId.toString());

		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.success) {
				alert(
					`Submission ${result.submission.valid ? 'accepted' : 'rejected'}!\nAI Reasoning: ${result.submission.aiReasoning}`
				);
				selectedFile = null;
				const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
				if (fileInput) fileInput.value = '';
			} else {
				alert('Upload failed: ' + result.error);
			}
		} catch (error) {
			alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
		} finally {
			uploading = false;
		}
	}
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<h1 class="text-4xl font-bold text-center mb-8 text-green-600">🎄 Christmas Scavenger Hunt 🎄</h1>

	<!-- Upload Section -->
	<div class="bg-white rounded-lg shadow-lg p-6 mb-8">
		<h2 class="text-2xl font-semibold mb-4">Submit Your Photo</h2>

		<div class="mb-4">
			<input
				type="file"
				accept="image/*"
				onchange={handleFileSelect}
				class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
			/>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
				<p class="mt-2 text-gray-500">Loading tasks...</p>
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				{#each tasks as task (task.id)}
					<div
						class="border rounded-lg p-4 {task.unlocked
							? 'bg-green-50 border-green-200'
							: 'bg-gray-50 border-gray-200'}"
					>
						<h3 class="font-semibold text-lg mb-2">{task.description}</h3>
						{#if !task.unlocked}
							<p class="text-sm text-gray-500 mb-2">
								Unlocks: {new Date(task.unlockDate).toLocaleDateString()}
							</p>
						{/if}
						<button
							onclick={() => uploadImage(task.id)}
							disabled={!task.unlocked || uploading || !selectedFile}
							class="w-full py-2 px-4 rounded-md font-medium transition-colors
								{task.unlocked && selectedFile && !uploading
								? 'bg-green-600 hover:bg-green-700 text-white'
								: 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
						>
							{uploading ? 'Uploading...' : `Submit for "${task.description}"`}
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Live Feed -->
	<div class="bg-white rounded-lg shadow-lg p-6">
		<h2 class="text-2xl font-semibold mb-4">Live Submissions Feed</h2>

		{#if submissions.length === 0}
			<p class="text-gray-500 text-center py-8">No submissions yet. Be the first!</p>
		{:else}
			<div class="space-y-4">
				{#each submissions as submission (submission.id)}
					<div
						class="border rounded-lg p-4 {submission.valid
							? 'border-green-200 bg-green-50'
							: 'border-red-200 bg-red-50'}"
					>
						<div class="flex items-start gap-4">
							<img
								src={submission.imagePath}
								alt="Submission"
								class="w-24 h-24 object-cover rounded-lg"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<span class="font-semibold">{submission.userName || 'Anonymous'}</span>
									<span class="text-sm text-gray-500"
										>submitted for "{submission.taskDescription}"</span
									>
									<span
										class="text-xs px-2 py-1 rounded-full {submission.valid
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{submission.valid ? '✅ Approved' : '❌ Rejected'}
									</span>
								</div>
								<p class="text-sm text-gray-600 italic">
									AI Judge: "{submission.aiReasoning}"
								</p>
								<p class="text-xs text-gray-400 mt-1">
									Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
