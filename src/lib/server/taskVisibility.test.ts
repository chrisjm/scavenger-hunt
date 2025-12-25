// ABOUTME: Tests task visibility helper behavior for group scoping.
// ABOUTME: Ensures requested group filtering works for admin/user flows.

import { describe, expect, it } from 'vitest';
import { resolveTaskGroupScope } from './taskVisibility';

describe('resolveTaskGroupScope', () => {
  it('returns empty when the user has no groups', () => {
    expect(resolveTaskGroupScope({ userGroupIds: [], requestedGroupId: null })).toEqual([]);
  });

  it('returns unique group ids when no specific group is requested', () => {
    const result = resolveTaskGroupScope({
      userGroupIds: ['g1', 'g2', 'g1'],
      requestedGroupId: null
    });
    expect(result).toEqual(['g1', 'g2']);
  });

  it('returns only the requested group when it is available to the user', () => {
    const result = resolveTaskGroupScope({
      userGroupIds: ['g1', 'g2'],
      requestedGroupId: 'g2'
    });
    expect(result).toEqual(['g2']);
  });

  it('returns empty when a requested group is not available to the user', () => {
    const result = resolveTaskGroupScope({
      userGroupIds: ['g1', 'g2'],
      requestedGroupId: 'g3'
    });
    expect(result).toEqual([]);
  });
});
