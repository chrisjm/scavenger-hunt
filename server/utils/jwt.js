import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET is not set in environment variables.');
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(JWT_SECRET);
const ISSUER = 'scavenger-hunt';

/**
 * Sign an auth token for a logged-in user.
 * @param {{ userId: string; authId: string; username: string; isAdmin: boolean }} payload
 * @returns {Promise<string>} JWT string
 */
export async function signAuthToken(payload) {
	const { userId, authId, username, isAdmin } = payload;

	return await new SignJWT({
		// sub is the primary app/user id (player user id)
		sub: userId,
		authId,
		username,
		isAdmin
	})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuedAt()
		.setIssuer(ISSUER)
		// Adjust expiration as needed for your app
		.setExpirationTime('7d')
		.sign(secretKey);
}

/**
 * Verify an auth token and return a normalized payload.
 * @param {string} token
 * @returns {Promise<{ userId: string; authId: string | null; username: string | null; isAdmin: boolean } | null>}
 */
export async function verifyAuthToken(token) {
	try {
		const { payload } = await jwtVerify(token, secretKey, { issuer: ISSUER });

		if (typeof payload.sub !== 'string') {
			return null;
		}

		return {
			userId: payload.sub,
			authId: typeof payload.authId === 'string' ? payload.authId : null,
			username: typeof payload.username === 'string' ? payload.username : null,
			isAdmin: Boolean(payload.isAdmin)
		};
	} catch {
		return null;
	}
}
