import { verifyAuthToken } from '../utils/jwt.js';

/**
 * Require a valid auth JWT in the auth_token cookie.
 * Attaches req.user = { userId, authId, username, isAdmin }.
 */
export async function requireAuth(req, res, next) {
	try {
		const token = req.cookies?.auth_token;
		if (!token || typeof token !== 'string') {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const payload = await verifyAuthToken(token);
		if (!payload) {
			// Clear invalid token
			res.cookie('auth_token', '', {
				expires: new Date(0),
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax'
			});
			return res.status(401).json({ error: 'Unauthorized' });
		}

		req.user = payload;
		return next();
	} catch (error) {
		console.error('Auth middleware error:', error);
		return res.status(500).json({ error: 'Authentication failed' });
	}
}
