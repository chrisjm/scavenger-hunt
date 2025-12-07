<script lang="ts">
	interface Props {
		show: boolean;
		loginName: string;
		loggingIn: boolean;
		onLogin: (isReturningUser: boolean) => Promise<void>;
		onNameChange: (name: string) => void;
	}

	let { show, loginName, loggingIn, onLogin, onNameChange }: Props = $props();
	let isReturningUser = $state(false);
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 md:p-8 transform transition-all">
			<div class="text-center mb-6">
				<div
					class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<span class="text-green-600 text-3xl">🎄</span>
				</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">
					{isReturningUser ? 'Welcome Back!' : 'Welcome to the Hunt!'}
				</h2>
				<p class="text-gray-600">
					{isReturningUser
						? 'Enter your username to continue your scavenger hunt'
						: 'Choose a unique name to join the Christmas Scavenger Hunt'}
				</p>
			</div>

			<!-- User Type Toggle -->
			<div class="mb-6">
				<div class="flex bg-gray-100 rounded-lg p-1">
					<button
						type="button"
						onclick={() => (isReturningUser = false)}
						class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 {!isReturningUser
							? 'bg-white text-green-600 shadow-sm'
							: 'text-gray-600 hover:text-gray-800'}"
					>
						🆕 New User
					</button>
					<button
						type="button"
						onclick={() => (isReturningUser = true)}
						class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 {isReturningUser
							? 'bg-white text-green-600 shadow-sm'
							: 'text-gray-600 hover:text-gray-800'}"
					>
						🔄 Returning User
					</button>
				</div>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					onLogin(isReturningUser);
				}}
			>
				<div class="mb-6">
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2"> Your Name </label>
					<input
						id="login-name"
						type="text"
						value={loginName}
						oninput={(e) => onNameChange(e.currentTarget.value)}
						placeholder={isReturningUser ? 'Enter your username' : 'Choose a unique name'}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
						disabled={loggingIn}
						maxlength="30"
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
