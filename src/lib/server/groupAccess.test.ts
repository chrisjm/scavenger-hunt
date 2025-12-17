// ABOUTME: Unit tests for ensureGroupAccess group membership guard.
// ABOUTME: Verifies admin bypass, missing user handling, and membership checks with mocked DB.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();
const getMock = vi.fn();

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
  db: {
    select: selectMock
  },
  schema: {
    userGroups: {
      userId: 'userId',
      groupId: 'groupId'
    }
  }
}));

let ensureGroupAccess: typeof import('./groupAccess').ensureGroupAccess;

beforeAll(async () => {
  ({ ensureGroupAccess } = await import('./groupAccess'));
});

beforeEach(() => {
  selectMock.mockReset();
  fromMock.mockReset();
  whereMock.mockReset();
  getMock.mockReset();

  whereMock.mockReturnValue({ get: getMock });
  fromMock.mockReturnValue({ where: whereMock });
  selectMock.mockReturnValue({ from: fromMock });
});

describe('ensureGroupAccess', () => {
  it('returns true for admins without querying DB', async () => {
    const result = await ensureGroupAccess({ userId: null, isAdmin: true, groupId: 'g1' });
    expect(result).toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns false for missing userId (non-admin) without querying DB', async () => {
    const result = await ensureGroupAccess({ userId: null, isAdmin: false, groupId: 'g1' });
    expect(result).toBe(false);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns true when membership exists', async () => {
    getMock.mockResolvedValueOnce({ id: 'membership-row' });
    const result = await ensureGroupAccess({ userId: 'u1', isAdmin: false, groupId: 'g1' });
    expect(result).toBe(true);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when membership does not exist', async () => {
    getMock.mockResolvedValueOnce(undefined);
    const result = await ensureGroupAccess({ userId: 'u1', isAdmin: false, groupId: 'g1' });
    expect(result).toBe(false);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
