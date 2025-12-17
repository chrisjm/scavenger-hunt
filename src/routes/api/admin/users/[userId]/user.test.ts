// ABOUTME: Unit tests for admin user update endpoint.
// ABOUTME: Verifies authorization, validation, and self-demotion prevention for PUT /api/admin/users/[userId].

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const fromMockEnsureAdmin = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();

const fromMockTargetUser = vi.fn();
const whereTargetMock = vi.fn();
const limitTargetMock = vi.fn();

const updateMock = vi.fn();
const setMock = vi.fn();
const whereUpdateMock = vi.fn();
const returningMock = vi.fn();

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
  db: {
    select: selectMock,
    update: updateMock
  },
  schema: {
    userProfiles: {
      id: 'id'
    }
  }
}));

let PUT: typeof import('./+server').PUT;

beforeAll(async () => {
  ({ PUT } = await import('./+server'));
});

beforeEach(() => {
  selectMock.mockReset();
  fromMockEnsureAdmin.mockReset();
  whereMock.mockReset();
  limitMock.mockReset();

  fromMockTargetUser.mockReset();
  whereTargetMock.mockReset();
  limitTargetMock.mockReset();

  updateMock.mockReset();
  setMock.mockReset();
  whereUpdateMock.mockReset();
  returningMock.mockReset();

  whereMock.mockReturnValue({ limit: limitMock });
  fromMockEnsureAdmin.mockReturnValue({ where: whereMock });

  whereTargetMock.mockReturnValue({ limit: limitTargetMock });
  fromMockTargetUser.mockReturnValue({ where: whereTargetMock });

  whereUpdateMock.mockReturnValue({ returning: returningMock });
  setMock.mockReturnValue({ where: whereUpdateMock });
  updateMock.mockReturnValue({ set: setMock });
});

describe('PUT /api/admin/users/[userId]', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await PUT({ locals: { user: null } } as any);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when authenticated user is not admin', async () => {
    selectMock.mockReturnValueOnce({ from: fromMockEnsureAdmin });
    limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: false }]);

    const response = await PUT({
      locals: { user: { userId: 'u1' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ isAdmin: true }) }
    } as any);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Admin privileges required' });
  });

  it('returns 400 when isAdmin is missing or invalid', async () => {
    selectMock.mockReturnValueOnce({ from: fromMockEnsureAdmin });
    limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: true }]);

    const response = await PUT({
      locals: { user: { userId: 'u1' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ isAdmin: 'nope' }) }
    } as any);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'isAdmin is required and must be a boolean' });
  });

  it('returns 409 when attempting to remove own admin privileges', async () => {
    selectMock.mockReturnValueOnce({ from: fromMockEnsureAdmin });
    limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: true }]);

    const response = await PUT({
      locals: { user: { userId: 'u1' } },
      params: { userId: 'u1' },
      request: { json: async () => ({ isAdmin: false }) }
    } as any);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'You cannot remove your own admin privileges' });
  });

  it('returns 404 when target user does not exist', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockTargetUser });

    limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: true }]);
    limitTargetMock.mockResolvedValueOnce([]);

    const response = await PUT({
      locals: { user: { userId: 'u1' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ isAdmin: true }) }
    } as any);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'User not found' });
  });

  it('updates isAdmin for target user', async () => {
    selectMock
      .mockReturnValueOnce({ from: fromMockEnsureAdmin })
      .mockReturnValueOnce({ from: fromMockTargetUser });

    limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: true }]);
    limitTargetMock.mockResolvedValueOnce([{ id: 'u2', isAdmin: false }]);
    returningMock.mockResolvedValueOnce([
      { id: 'u2', displayName: 'Bob', isAdmin: true, createdAt: new Date('2025-01-01') }
    ]);

    const response = await PUT({
      locals: { user: { userId: 'u1' } },
      params: { userId: 'u2' },
      request: { json: async () => ({ isAdmin: true }) }
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: 'u2', displayName: 'Bob', isAdmin: true, createdAt: '2025-01-01T00:00:00.000Z' }
    });
  });
});
