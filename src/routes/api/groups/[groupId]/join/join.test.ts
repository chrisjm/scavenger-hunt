// ABOUTME: Unit tests for the group join endpoint.
// ABOUTME: Verifies non-admin single-group membership enforcement and join validation.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();

const fromMockGroup = vi.fn();
const whereGroupMock = vi.fn();
const limitGroupMock = vi.fn();

const fromMockUser = vi.fn();
const whereUserMock = vi.fn();
const limitUserMock = vi.fn();

const fromMockExisting = vi.fn();
const whereExistingMock = vi.fn();
const limitExistingMock = vi.fn();

const fromMockAnyMembership = vi.fn();
const whereAnyMembershipMock = vi.fn();
const limitAnyMembershipMock = vi.fn();

const insertMock = vi.fn();
const valuesMock = vi.fn();

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock
  },
  schema: {
    groups: { id: 'id' },
    userProfiles: { id: 'id' },
    userGroups: { userId: 'userId', groupId: 'groupId' }
  }
}));

let POST: typeof import('./+server').POST;

beforeAll(async () => {
  ({ POST } = await import('./+server'));
});

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  valuesMock.mockReset();

  fromMockGroup.mockReset();
  whereGroupMock.mockReset();
  limitGroupMock.mockReset();

  fromMockUser.mockReset();
  whereUserMock.mockReset();
  limitUserMock.mockReset();

  fromMockExisting.mockReset();
  whereExistingMock.mockReset();
  limitExistingMock.mockReset();

  fromMockAnyMembership.mockReset();
  whereAnyMembershipMock.mockReset();
  limitAnyMembershipMock.mockReset();

  whereGroupMock.mockReturnValue({ limit: limitGroupMock });
  fromMockGroup.mockReturnValue({ where: whereGroupMock });

  whereUserMock.mockReturnValue({ limit: limitUserMock });
  fromMockUser.mockReturnValue({ where: whereUserMock });

  whereExistingMock.mockReturnValue({ limit: limitExistingMock });
  fromMockExisting.mockReturnValue({ where: whereExistingMock });

  whereAnyMembershipMock.mockReturnValue({ limit: limitAnyMembershipMock });
  fromMockAnyMembership.mockReturnValue({ where: whereAnyMembershipMock });

  insertMock.mockReturnValue({ values: valuesMock });
});

describe('POST /api/groups/[groupId]/join', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await POST({ locals: { user: null }, params: { groupId: 'g1' } } as any);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 409 when non-admin already belongs to a group', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockGroup })
      .mockReturnValueOnce({ from: fromMockUser })
      .mockReturnValueOnce({ from: fromMockExisting })
      .mockReturnValueOnce({ from: fromMockAnyMembership });

    limitGroupMock.mockResolvedValueOnce([{ id: 'g2' }]);
    limitUserMock.mockResolvedValueOnce([{ id: 'u1' }]);
    limitExistingMock.mockResolvedValueOnce([]);
    limitAnyMembershipMock.mockResolvedValueOnce([{ id: 'ug1', userId: 'u1', groupId: 'g1' }]);

    const response = await POST({
      locals: { user: { userId: 'u1', isAdmin: false } },
      params: { groupId: 'g2' }
    } as any);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'User can only be a member of one group' });
  });

  it('allows admin users to join regardless of other memberships', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockGroup })
      .mockReturnValueOnce({ from: fromMockUser })
      .mockReturnValueOnce({ from: fromMockExisting });

    limitGroupMock.mockResolvedValueOnce([{ id: 'g2' }]);
    limitUserMock.mockResolvedValueOnce([{ id: 'u1' }]);
    limitExistingMock.mockResolvedValueOnce([]);
    valuesMock.mockResolvedValueOnce(undefined);

    const response = await POST({
      locals: { user: { userId: 'u1', isAdmin: true } },
      params: { groupId: 'g2' }
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});
