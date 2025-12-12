// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				userId: string;
				authId: string | null;
				username: string | null;
				isAdmin: boolean;
			} | null;
			// No session object: auth is handled via JWT in auth_token cookie
		}
	} // interface Error {}
	// interface Locals {}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
