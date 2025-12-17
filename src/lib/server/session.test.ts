// ABOUTME: Unit tests for session token validation logic.
// ABOUTME: Uses mocked DB to verify format parsing, expiry cleanup, and hashing behavior.

import crypto from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();

const deleteMock = vi.fn();
const deleteWhereMock = vi.fn();

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => ({ eq: args }))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: selectMock,
		delete: deleteMock,
		insert: vi.fn()
	},
	schema: {
		sessions: {
			id: 'id'
		}
	}
}));

let validateSessionToken: typeof import('./session').validateSessionToken;

beforeAll(async () => {
	({ validateSessionToken } = await import('./session'));
});

beforeEach(() => {
	selectMock.mockReset();
	fromMock.mockReset();
	whereMock.mockReset();
	limitMock.mockReset();
	deleteMock.mockReset();
	deleteWhereMock.mockReset();

	whereMock.mockReturnValue({ limit: limitMock });
	fromMock.mockReturnValue({ where: whereMock });
	selectMock.mockReturnValue({ from: fromMock });

	deleteMock.mockReturnValue({ where: deleteWhereMock });
	deleteWhereMock.mockResolvedValue(undefined);
});

describe('validateSessionToken', () => {
	it('returns null for malformed tokens', async () => {
		const result = await validateSessionToken('not-a-token');
		expect(result).toBeNull();
		expect(selectMock).not.toHaveBeenCalled();
	});

	it('returns null when no session is found', async () => {
		limitMock.mockResolvedValueOnce([]);
		const result = await validateSessionToken('sess.secret');
		expect(result).toBeNull();
		expect(selectMock).toHaveBeenCalledTimes(1);
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it('deletes and returns null for expired sessions', async () => {
		const old = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days
		limitMock.mockResolvedValueOnce([
			{ id: 'sess', userId: 'u1', secretHash: 'whatever', createdAt: new Date(old) }
		]);

		const result = await validateSessionToken('sess.secret');
		expect(result).toBeNull();
		expect(deleteMock).toHaveBeenCalledTimes(1);
		expect(deleteWhereMock).toHaveBeenCalledTimes(1);
	});

	it('returns session when token secret matches stored hash and session is not expired', async () => {
		const secret = 'super-secret';
		const secretHash = crypto.createHash('sha256').update(secret, 'utf8').digest('base64');

		const sessionRow = {
			id: 'sess',
			userId: 'u1',
			secretHash,
			createdAt: new Date()
		};
		limitMock.mockResolvedValueOnce([sessionRow]);

		const result = await validateSessionToken(`sess.${secret}`);
		expect(result).toEqual(sessionRow);
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it('returns null when token secret does not match stored hash', async () => {
		const sessionRow = {
			id: 'sess',
			userId: 'u1',
			secretHash: crypto.createHash('sha256').update('other', 'utf8').digest('base64'),
			createdAt: new Date()
		};
		limitMock.mockResolvedValueOnce([sessionRow]);

		const result = await validateSessionToken('sess.wrong');
		expect(result).toBeNull();
		expect(deleteMock).not.toHaveBeenCalled();
	});
});
