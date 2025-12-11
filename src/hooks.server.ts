import type { Handle } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { deleteSession, validateSessionToken } from '$lib/server/session';

const handleAuth: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('auth_token');

	if (!token) {
		event.locals.user = null;
		return resolve(event);
	}

	const session = await validateSessionToken(token);

	if (!session) {
		// Clear invalid or expired session token
		event.cookies.set('auth_token', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true
		});
		event.locals.user = null;
		return resolve(event);
	}

	// Look up auth user and corresponding player user
	const [authUser] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.id, session.userId))
		.limit(1);

	if (!authUser) {
		await deleteSession(session.id);
		event.cookies.set('auth_token', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true
		});
		event.locals.user = null;
		return resolve(event);
	}

	const [playerUser] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, authUser.playerUserId))
		.limit(1);

	if (!playerUser) {
		await deleteSession(session.id);
		event.cookies.set('auth_token', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true
		});
		event.locals.user = null;
		return resolve(event);
	}

	event.locals.user = {
		userId: playerUser.id,
		authId: authUser.id,
		username: authUser.username,
		isAdmin: playerUser.isAdmin ?? false
	};

	return resolve(event);
};

export const handle: Handle = handleAuth;
