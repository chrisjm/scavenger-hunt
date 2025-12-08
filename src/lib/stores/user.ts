import { getContext } from 'svelte';

interface UserContext {
	userId: string | null;
	userName: string | null;
}

export function getUserContext(): UserContext {
	return getContext('user');
}
