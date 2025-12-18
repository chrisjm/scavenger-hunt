// ABOUTME: Unit tests for admin user group membership endpoints.
// ABOUTME: Verifies authorization and basic behavior for GET/POST/DELETE /api/admin/users/[userId]/groups.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const insertMock = vi.fn();
const deleteMock = vi.fn();

const fromMockEnsureAdmin = vi.fn();
const whereEnsureAdminMock = vi.fn();
const limitEnsureAdminMock = vi.fn();

const fromMockTargetUser = vi.fn();
const whereTargetUserMock = vi.fn();
const limitTargetUserMock = vi.fn();

const fromMockGroupsJoin = vi.fn();
const innerJoinMock = vi.fn();
const whereGroupsJoinMock = vi.fn();

const fromMockGroupLookup = vi.fn();
const whereGroupLookupMock = vi.fn();
const limitGroupLookupMock = vi.fn();

const fromMockMembershipLookup = vi.fn();
const whereMembershipLookupMock = vi.fn();
const limitMembershipLookupMock = vi.fn();

const valuesMock = vi.fn();
const deleteWhereMock = vi.fn();

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    delete: deleteMock
  },
  schema: {
    userProfiles: { id: 'id' },
    groups: { id: 'id', name: 'name', description: 'description' },
    userGroups: { userId: 'userId', groupId: 'groupId', joinedAt: 'joinedAt' }
  }
}));

let GET: typeof import('./+server').GET;
let POST: typeof import('./+server').POST;
let DELETE: typeof import('./+server').DELETE;

beforeAll(async () => {
  ({ GET, POST, DELETE } = await import('./+server'));
});

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  deleteMock.mockReset();

  fromMockEnsureAdmin.mockReset();
  whereEnsureAdminMock.mockReset();
  limitEnsureAdminMock.mockReset();

  fromMockTargetUser.mockReset();
  whereTargetUserMock.mockReset();
  limitTargetUserMock.mockReset();

  fromMockGroupsJoin.mockReset();
  innerJoinMock.mockReset();
  whereGroupsJoinMock.mockReset();

  fromMockGroupLookup.mockReset();
  whereGroupLookupMock.mockReset();
  limitGroupLookupMock.mockReset();

  fromMockMembershipLookup.mockReset();
  whereMembershipLookupMock.mockReset();
  limitMembershipLookupMock.mockReset();

  valuesMock.mockReset();
  deleteWhereMock.mockReset();

  whereEnsureAdminMock.mockReturnValue({ limit: limitEnsureAdminMock });
  fromMockEnsureAdmin.mockReturnValue({ where: whereEnsureAdminMock });

  whereTargetUserMock.mockReturnValue({ limit: limitTargetUserMock });
  fromMockTargetUser.mockReturnValue({ where: whereTargetUserMock });

  whereGroupLookupMock.mockReturnValue({ limit: limitGroupLookupMock });
  fromMockGroupLookup.mockReturnValue({ where: whereGroupLookupMock });

  whereMembershipLookupMock.mockReturnValue({ limit: limitMembershipLookupMock });
  fromMockMembershipLookup.mockReturnValue({ where: whereMembershipLookupMock });

  innerJoinMock.mockReturnValue({ where: whereGroupsJoinMock });
  fromMockGroupsJoin.mockReturnValue({ innerJoin: innerJoinMock });

  insertMock.mockReturnValue({ values: valuesMock });
  deleteMock.mockReturnValue({ where: deleteWhereMock });
});

describe('admin user groups endpoints', () => {
  it('GET returns 401 when not authenticated', async () => {
    const response = await GET({ locals: { user: null }, params: { userId: 'u1' } } as any);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('GET returns groups when admin', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockTargetUser })
      .mockReturnValueOnce({ from: fromMockGroupsJoin });

    limitEnsureAdminMock.mockResolvedValueOnce([{ id: 'admin', isAdmin: true }]);
    limitTargetUserMock.mockResolvedValueOnce([{ id: 'u2', isAdmin: false }]);
    whereGroupsJoinMock.mockResolvedValueOnce([
      { id: 'g1', name: 'Team A', description: null, joinedAt: new Date('2025-01-01') }
    ]);

    const response = await GET({
      locals: { user: { userId: 'admin' } },
      params: { userId: 'u2' }
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      groups: [{ id: 'g1', name: 'Team A', description: null, joinedAt: '2025-01-01T00:00:00.000Z' }]
    });
  });

  it('POST adds membership when admin', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockTargetUser })
      .mockReturnValueOnce({ from: fromMockGroupLookup })
      .mockReturnValueOnce({ from: fromMockMembershipLookup })
      .mockReturnValueOnce({ from: fromMockMembershipLookup });

    limitEnsureAdminMock.mockResolvedValueOnce([{ id: 'admin', isAdmin: true }]);
    limitTargetUserMock.mockResolvedValueOnce([{ id: 'u2', isAdmin: false }]);
    limitGroupLookupMock.mockResolvedValueOnce([{ id: 'g1', name: 'Team A' }]);
    limitMembershipLookupMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    valuesMock.mockResolvedValueOnce(undefined);

    const response = await POST({
      locals: { user: { userId: 'admin' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ groupId: 'g1' }) }
    } as any);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('POST returns 409 when non-admin user already has a group', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockTargetUser })
      .mockReturnValueOnce({ from: fromMockGroupLookup })
      .mockReturnValueOnce({ from: fromMockMembershipLookup })
      .mockReturnValueOnce({ from: fromMockMembershipLookup });

    limitEnsureAdminMock.mockResolvedValueOnce([{ id: 'admin', isAdmin: true }]);
    limitTargetUserMock.mockResolvedValueOnce([{ id: 'u2', isAdmin: false }]);
    limitGroupLookupMock.mockResolvedValueOnce([{ id: 'g2', name: 'Team B' }]);
    limitMembershipLookupMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'ug1', userId: 'u2', groupId: 'g1' }]);

    const response = await POST({
      locals: { user: { userId: 'admin' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ groupId: 'g2' }) }
    } as any);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'User can only be a member of one group' });
  });

  it('DELETE removes membership when admin', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockMembershipLookup });

    limitEnsureAdminMock.mockResolvedValueOnce([{ id: 'admin', isAdmin: true }]);
    limitMembershipLookupMock.mockResolvedValueOnce([{ id: 'ug1', userId: 'u2', groupId: 'g1' }]);
    deleteWhereMock.mockResolvedValueOnce(undefined);

    const response = await DELETE({
      locals: { user: { userId: 'admin' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ groupId: 'g1' }) }
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
