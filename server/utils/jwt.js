import {
	signAuthToken as tsSignAuthToken,
	verifyAuthToken as tsVerifyAuthToken
} from '../../src/lib/server/jwt.ts';

/**
 * Sign an auth token for a logged-in user.
 * @param {{ userId: string; authId: string; username: string; isAdmin: boolean }} payload
 * @returns {Promise<string>} JWT string
 */
export async function signAuthToken(payload) {
	return tsSignAuthToken(payload);
}

/**
 * Verify an auth token and return a normalized payload.
 * @param {string} token
 * @returns {Promise<{ userId: string; authId: string | null; username: string | null; isAdmin: boolean } | null>}
 */
export async function verifyAuthToken(token) {
	return tsVerifyAuthToken(token);
}
