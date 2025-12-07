<script lang="ts">
	import { io } from 'socket.io-client';
	import type { Socket } from 'socket.io-client';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import StatsGrid from '$lib/components/StatsGrid.svelte';
	import TaskGrid from '$lib/components/TaskGrid.svelte';
	import TabbedView from '$lib/components/TabbedView.svelte';

	let socket: Socket | undefined;
	let submissions = $state<any[]>([]);
	let selectedFile = $state<File | null>(null);
	let uploading = $state(false);
	let loading = $state(true);
	let tasks = $state<any[]>([]);
	let leaderboard = $state<any[]>([]);
	let leaderboardLoading = $state(false);

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
			socket?.emit('join-room', userId);
		});

		socket.on('new-submission', (submission: any) => {
			submissions = [submission, ...submissions];
			// Refresh leaderboard when a valid submission comes in
			if (submission.valid) {
				loadLeaderboard();
			}
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
		loadLeaderboard();

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

	function handleNameChange(name: string) {
		loginName = name;
	}

	// Load leaderboard data
	async function loadLeaderboard() {
		leaderboardLoading = true;
		try {
			const response = await fetch('/api/leaderboard');
			leaderboard = await response.json();
		} catch (error) {
			console.error('Failed to load leaderboard:', error);
		} finally {
			leaderboardLoading = false;
		}
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

<div class="container mx-auto p-4 md:p-6 max-w-4xl">
	<!-- Hero Section -->
	<div class="text-center mb-8 md:mb-12">
		<h1
			class="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 via-red-500 to-green-600 bg-clip-text text-transparent"
		>
			🎄 Christmas Scavenger Hunt 🎄
		</h1>
		<p class="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
			Find festive items around you and share them with the community! Upload photos to complete
			challenges and see what others have discovered.
		</p>
	</div>

	<!-- Stats Dashboard -->
	<div class="mb-6 md:mb-8">
		<StatsGrid
			{loading}
			{totalTasks}
			unlockedTasks={unlockedTasks.length}
			{completionRate}
			approvedSubmissions={approvedSubmissions.length}
			totalSubmissions={submissions.length}
		/>
	</div>

	<!-- Upload Section -->
	<div class="mb-6 md:mb-8">
		<TaskGrid
			{tasks}
			{loading}
			{selectedFile}
			{uploading}
			onFileSelect={handleFileSelect}
			onUpload={uploadImage}
		/>
	</div>

	<!-- Community Activity -->
	<TabbedView {submissions} {leaderboard} {leaderboardLoading} />
</div>

<!-- Login Modal -->
<LoginModal
	show={showLoginModal}
	{loginName}
	{loggingIn}
	onLogin={loginUser}
	onNameChange={handleNameChange}
/>
