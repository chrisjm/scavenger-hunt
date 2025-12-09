import type { Handle } from '@sveltejs/kit';
import { verifyAuthToken } from '$lib/server/jwt';

const handleAuth: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('auth_token');

	if (!token) {
		event.locals.user = null;
		return resolve(event);
	}

	const payload = await verifyAuthToken(token);

	if (!payload) {
		// Clear invalid token
		event.cookies.set('auth_token', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true
		});
		event.locals.user = null;
		return resolve(event);
	}

	event.locals.user = {
		userId: payload.userId,
		authId: payload.authId,
		username: payload.username,
		isAdmin: payload.isAdmin
	};

	return resolve(event);
};

export const handle: Handle = handleAuth;
