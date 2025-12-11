// ABOUTME: Exposes user context typing and shared stores for groups and active group selection.
// ABOUTME: Provides helpers to access context and manage persisted active group state.
import { getContext } from 'svelte';
import { writable } from 'svelte/store';

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
	resetGroups: () => void;
}

export const userGroupsStore = writable<GroupSummary[]>([]);
export const activeGroupIdStore = writable<string | null>(null);

export function setActiveGroup(id: string | null) {
	activeGroupIdStore.set(id);
	if (typeof localStorage !== 'undefined') {
		if (id) {
			localStorage.setItem('scavenger-hunt-activeGroupId', id);
		} else {
			localStorage.removeItem('scavenger-hunt-activeGroupId');
		}
	}
}

export function resetGroupStores() {
	userGroupsStore.set([]);
	activeGroupIdStore.set(null);
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('scavenger-hunt-activeGroupId');
	}
}

export function getUserContext(): UserContext {
	return getContext('user');
}
