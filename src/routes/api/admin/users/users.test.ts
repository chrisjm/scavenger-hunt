// ABOUTME: Unit tests for the admin users listing API endpoint.
// ABOUTME: Verifies authorization and response shaping for GET /api/admin/users.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const fromMockEnsureAdmin = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();

const fromMockListUsers = vi.fn();
const orderByMock = vi.fn();

const fromMockAuthUsers = vi.fn();
const fromMockSessions = vi.fn();

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: selectMock
	},
	schema: {
		userProfiles: {
			id: 'id',
			createdAt: 'createdAt'
		},
		authUsers: {
			id: 'id',
			profileId: 'profileId'
		},
		sessions: {
			userId: 'userId',
			createdAt: 'createdAt'
		}
	}
}));

let GET: typeof import('./+server').GET;

beforeAll(async () => {
	({ GET } = await import('./+server'));
});

beforeEach(() => {
	selectMock.mockReset();
	fromMockEnsureAdmin.mockReset();
	whereMock.mockReset();
	limitMock.mockReset();
	fromMockListUsers.mockReset();
	orderByMock.mockReset();
	fromMockAuthUsers.mockReset();
	fromMockSessions.mockReset();

	whereMock.mockReturnValue({ limit: limitMock });
	fromMockEnsureAdmin.mockReturnValue({ where: whereMock });

	fromMockListUsers.mockReturnValue({ orderBy: orderByMock });
});

describe('GET /api/admin/users', () => {
	it('returns 401 when not authenticated', async () => {
		const response = await GET({ locals: { user: null } } as any);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	it('returns 403 when authenticated user is not admin', async () => {
		selectMock.mockReturnValueOnce({ from: fromMockEnsureAdmin });
		limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: false }]);

		const response = await GET({ locals: { user: { userId: 'u1' } } } as any);
		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body).toEqual({ error: 'Admin privileges required' });
	});

	it('returns users when authenticated user is admin', async () => {
		selectMock
			.mockReturnValueOnce({ from: fromMockEnsureAdmin })
			.mockReturnValueOnce({ from: fromMockListUsers })
			.mockReturnValueOnce({ from: fromMockAuthUsers })
			.mockReturnValueOnce({ from: fromMockSessions });

		limitMock.mockResolvedValueOnce([{ id: 'u1', isAdmin: true }]);
		orderByMock.mockResolvedValueOnce([
			{ id: 'u1', displayName: 'Alice', isAdmin: true, createdAt: new Date('2025-01-01') },
			{ id: 'u2', displayName: 'Bob', isAdmin: false, createdAt: new Date('2025-01-02') }
		]);
		fromMockAuthUsers.mockResolvedValueOnce([
			{ id: 'a1', username: 'alice', profileId: 'u1' },
			{ id: 'a2', username: 'bob', profileId: 'u2' }
		]);
		fromMockSessions.mockResolvedValueOnce([
			{ id: 's1', userId: 'a1', secretHash: 'x', createdAt: new Date('2025-02-01') },
			{ id: 's2', userId: 'a1', secretHash: 'y', createdAt: new Date('2025-02-02') }
		]);

		const response = await GET({ locals: { user: { userId: 'u1' } } } as any);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({
			users: [
				{
					id: 'u1',
					displayName: 'Alice',
					isAdmin: true,
					createdAt: '2025-01-01T00:00:00.000Z',
					lastLoginAt: '2025-02-02T00:00:00.000Z'
				},
				{
					id: 'u2',
					displayName: 'Bob',
					isAdmin: false,
					createdAt: '2025-01-02T00:00:00.000Z',
					lastLoginAt: null
				}
			]
		});
	});
});
