<script lang="ts">
	import { io } from 'socket.io-client';
	import type { Socket } from 'socket.io-client';

	let socket: Socket | undefined;
	let submissions = $state<any[]>([]);
	let selectedFile = $state<File | null>(null);
	let uploading = $state(false);
	let loading = $state(true);
	let tasks = $state<any[]>([]);

	// User authentication state
	let userId = $state<string | null>(null);
	let userName = $state<string | null>(null);
	let showLoginModal = $state(false);
	let loginName = $state('');
	let loggingIn = $state(false);

	// Derived stats
	let unlockedTasks = $derived(tasks.filter((task) => task.unlocked));
	let totalTasks = $derived(tasks.length);
	let completionRate = $derived(
		totalTasks > 0 ? Math.round((unlockedTasks.length / totalTasks) * 100) : 0
	);
	let approvedSubmissions = $derived(submissions.filter((sub) => sub.valid));

	// Check for existing user in localStorage
	function checkExistingUser() {
		const storedUserId = localStorage.getItem('scavenger-hunt-userId');
		const storedUserName = localStorage.getItem('scavenger-hunt-userName');

		if (storedUserId && storedUserName) {
			userId = storedUserId;
			userName = storedUserName;
		} else {
			showLoginModal = true;
		}
	}

	// Login user
	async function loginUser() {
		if (!loginName.trim()) {
			alert('Please enter your name');
			return;
		}

		loggingIn = true;
		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: loginName.trim() })
			});

			const result = await response.json();

			if (result.success) {
				userId = result.userId;
				userName = result.name;

				// Store in localStorage
				localStorage.setItem('scavenger-hunt-userId', result.userId);
				localStorage.setItem('scavenger-hunt-userName', result.name);

				showLoginModal = false;
				loginName = '';

				// Connect to socket now that we have a user
				connectSocket();
			} else {
				alert('Login failed: ' + result.error);
			}
		} catch (error) {
			alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
		} finally {
			loggingIn = false;
		}
	}

	// Connect to socket
	function connectSocket() {
		if (!userId) return;

		socket = io();
		socket.on('connect', () => {
			console.log('Connected to server');
			socket.emit('join-room', userId);
		});

		socket.on('new-submission', (submission: any) => {
			submissions = [submission, ...submissions];
		});
	}

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

		// Check for existing user
		checkExistingUser();

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

		if (!userId) {
			alert('Please log in first');
			showLoginModal = true;
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
	<!-- Hero Section -->
	<div class="text-center mb-12">
		<h1
			class="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 via-red-500 to-green-600 bg-clip-text text-transparent"
		>
			🎄 Christmas Scavenger Hunt 🎄
		</h1>
		<p class="text-xl text-gray-600 max-w-2xl mx-auto">
			Find festive items around you and share them with the community! Upload photos to complete
			challenges and see what others have discovered.
		</p>
	</div>

	<!-- Stats Dashboard -->
	{#if !loading && totalTasks > 0}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
			<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">🎯</span>
					<span class="text-sm font-medium text-gray-600">Available Tasks</span>
				</div>
				<div class="text-2xl font-bold text-green-600">{unlockedTasks.length}</div>
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
				<div class="text-2xl font-bold text-emerald-600">{approvedSubmissions.length}</div>
				<div class="text-xs text-gray-500">submissions</div>
			</div>

			<div class="bg-white rounded-xl p-4 shadow-md border border-gray-100">
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">📡</span>
					<span class="text-sm font-medium text-gray-600">Total Activity</span>
				</div>
				<div class="text-2xl font-bold text-purple-600">{submissions.length}</div>
				<div class="text-xs text-gray-500">submissions</div>
			</div>
		</div>
	{/if}

	<!-- Upload Section -->
	<div
		class="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-xl p-8 mb-8 border border-green-100"
	>
		<div class="flex items-center gap-3 mb-6">
			<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
				<span class="text-green-600 text-xl">📸</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800">Submit Your Photo</h2>
		</div>

		<div class="mb-6">
			<div class="relative">
				<input
					type="file"
					accept="image/*"
					onchange={handleFileSelect}
					class="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-green-50 file:to-green-100 file:text-green-700 hover:file:from-green-100 hover:file:to-green-200 file:transition-all file:duration-200 file:shadow-sm hover:file:shadow-md border-2 border-dashed border-green-200 rounded-lg p-4 hover:border-green-300 transition-colors"
				/>
				{#if selectedFile}
					<div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
						<div class="flex items-center gap-2">
							<span class="text-green-600">✅</span>
							<span class="text-sm font-medium text-green-800">Selected: {selectedFile.name}</span>
							<span class="text-xs text-green-600">({Math.round(selectedFile.size / 1024)}KB)</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
				<p class="mt-2 text-gray-500">Loading tasks...</p>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each tasks as task (task.id)}
					<div
						class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 {task.unlocked
							? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
							: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'}"
					>
						<!-- Status Badge -->
						<div class="absolute top-3 right-3">
							{#if task.unlocked}
								<div
									class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full border border-green-200"
								>
									🔓 Available
								</div>
							{:else}
								<div
									class="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full border border-gray-200"
								>
									🔒 Locked
								</div>
							{/if}
						</div>

						<div class="p-6">
							<!-- Task Icon and Title -->
							<div class="flex items-start gap-3 mb-4">
								<div
									class="w-12 h-12 rounded-full flex items-center justify-center {task.unlocked
										? 'bg-green-100'
										: 'bg-gray-100'}"
								>
									<span class="text-2xl">
										{#if task.description.includes('Santa')}🎅
										{:else if task.description.includes('Tree')}🎄
										{:else if task.description.includes('Lights')}✨
										{:else if task.description.includes('Candy')}🍭
										{:else if task.description.includes('Snowman')}⛄
										{:else if task.description.includes('Reindeer')}🦌
										{:else if task.description.includes('Cookie')}🍪
										{:else if task.description.includes('Stocking')}🧦
										{:else}🎁{/if}
									</span>
								</div>
								<div class="flex-1">
									<h3 class="font-bold text-lg text-gray-800 mb-1">{task.description}</h3>
									<div class="flex items-center gap-2 text-sm text-gray-600">
										<span class="inline-flex items-center gap-1">
											<span
												class="w-2 h-2 rounded-full {task.unlocked
													? 'bg-green-400'
													: 'bg-gray-400'}"
											></span>
											{task.unlocked ? 'Ready to submit' : 'Coming soon'}
										</span>
									</div>
								</div>
							</div>

							{#if !task.unlocked}
								<div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
									<div class="flex items-center gap-2 text-amber-800">
										<span>⏰</span>
										<span class="text-sm font-medium">
											Unlocks: {new Date(task.unlockDate).toLocaleDateString('en-US', {
												weekday: 'short',
												month: 'short',
												day: 'numeric'
											})}
										</span>
									</div>
								</div>
							{/if}

							<button
								onclick={() => uploadImage(task.id)}
								disabled={!task.unlocked || uploading || !selectedFile}
								class="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 {task.unlocked &&
								selectedFile &&
								!uploading
									? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
									: 'bg-gray-200 text-gray-500 cursor-not-allowed'}"
							>
								{#if uploading}
									<div class="flex items-center justify-center gap-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										<span>Uploading...</span>
									</div>
								{:else if !task.unlocked}
									<span>🔒 Task Locked</span>
								{:else if !selectedFile}
									<span>📸 Select Photo First</span>
								{:else}
									<span>🚀 Submit Photo</span>
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Live Feed -->
	<div
		class="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-xl p-8 border border-blue-100"
	>
		<div class="flex items-center gap-3 mb-6">
			<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
				<span class="text-blue-600 text-xl">📡</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800">Live Submissions Feed</h2>
			{#if submissions.length > 0}
				<div class="ml-auto">
					<div
						class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200"
					>
						{submissions.length} submission{submissions.length === 1 ? '' : 's'}
					</div>
				</div>
			{/if}
		</div>

		{#if submissions.length === 0}
			<div class="text-center py-12">
				<div
					class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<span class="text-gray-400 text-2xl">📸</span>
				</div>
				<p class="text-gray-500 text-lg font-medium mb-2">No submissions yet</p>
				<p class="text-gray-400">Be the first to share your festive finds!</p>
			</div>
		{:else}
			<div class="space-y-4 max-h-96 overflow-y-auto">
				{#each submissions as submission (submission.id)}
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
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Login Modal -->
{#if showLoginModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 transform transition-all">
			<div class="text-center mb-6">
				<div
					class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<span class="text-green-600 text-3xl">🎄</span>
				</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">Welcome to the Hunt!</h2>
				<p class="text-gray-600">Enter your name to join the Christmas Scavenger Hunt</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					loginUser();
				}}
			>
				<div class="mb-6">
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2"> Your Name </label>
					<input
						id="name"
						type="text"
						bind:value={loginName}
						placeholder="Enter your name..."
						disabled={loggingIn}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
						required
					/>
				</div>

				<button
					type="submit"
					disabled={loggingIn || !loginName.trim()}
					class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{#if loggingIn}
						<div class="flex items-center justify-center gap-2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							<span>Joining...</span>
						</div>
					{:else}
						🚀 Start Hunting!
					{/if}
				</button>
			</form>

			<div class="mt-4 text-center">
				<p class="text-xs text-gray-500">Your name will be displayed with your submissions</p>
			</div>
		</div>
	</div>
{/if}
