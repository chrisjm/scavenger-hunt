import { getContext } from 'svelte';

export interface GroupSummary {
	id: string;
	name: string;
	description: string | null;
}

interface UserContext {
	userId: string | null;
	userName: string | null;
	isAdmin: boolean | null;
	userGroups: GroupSummary[];
	activeGroupId: string | null;
	setActiveGroup: (id: string | null) => void;
	refreshGroups: () => Promise<void>;
}

export function getUserContext(): UserContext {
	return getContext('user');
}
