// ABOUTME: Determines which group IDs should be used when querying tasks.
// ABOUTME: Ensures group-scoped task lists can honor active group filters.

interface TaskGroupScopeInput {
  userGroupIds: string[];
  requestedGroupId: string | null;
}

export function resolveTaskGroupScope({
  userGroupIds,
  requestedGroupId
}: TaskGroupScopeInput): string[] {
  const uniqueIds = [...new Set(userGroupIds)];

  if (!requestedGroupId) {
    return uniqueIds;
  }

  return uniqueIds.includes(requestedGroupId) ? [requestedGroupId] : [];
}
