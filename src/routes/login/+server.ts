import { json, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as authUser, users as playerUsers } from '$lib/server/db/schema';

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 9; // must be > 8

const adminIdsEnv = (process.env.ADMIN_USER_IDS || '')
	.split(',')
	.map((id) => id.trim())
	.filter(Boolean);
const ADMIN_ID_SET = new Set(adminIdsEnv);

export const POST = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	const rawName: unknown = body.name;
	const rawPassword: unknown = body.password;
	const isReturningUser: boolean = Boolean(body.isReturningUser);

	if (typeof rawName !== 'string' || typeof rawPassword !== 'string') {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	const name = rawName.trim();
	const password = rawPassword;

	if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
		return json(
			{ error: `Name must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` },
			{ status: 400 }
		);
	}

	if (password.length < PASSWORD_MIN) {
		return json({ error: 'Password must be more than 8 characters' }, { status: 400 });
	}

	// Look up existing auth user by username
	const [existingAuthUser] = await db
		.select()
		.from(authUser)
		.where(eq(authUser.username, name))
		.limit(1);

	if (isReturningUser) {
		if (!existingAuthUser) {
			return json(
				{
					error: 'User not found',
					message: `No user found with the name "${name}". Please check your spelling or create a new account.`
				},
				{ status: 404 }
			);
		}

		const passwordValid = await verify(existingAuthUser.passwordHash, password).catch(() => false);
		if (!passwordValid) {
			return json({ error: 'Incorrect password' }, { status: 400 });
		}

		// fetch the player row to get isAdmin
		const [player] = await db
			.select()
			.from(playerUsers)
			.where(eq(playerUsers.id, existingAuthUser.playerUserId))
			.limit(1);

		const session = await lucia.createSession(existingAuthUser.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		return json({
			userId: existingAuthUser.playerUserId,
			userName: existingAuthUser.username,
			isReturningUser: true,
			isAdmin: player?.isAdmin ?? false
		});
	}

	// New user flow
	if (existingAuthUser) {
		return json(
			{
				error: 'Name already taken',
				message: 'This name is already taken. Please choose a different name.'
			},
			{ status: 409 }
		);
	}

	const passwordHash = await hash(password);
	const playerUserId = crypto.randomUUID();
	const authUserId = crypto.randomUUID();

	// compute admin flag from env
	const isAdmin = ADMIN_ID_SET.has(playerUserId);

	// create player row
	await db.insert(playerUsers).values({ id: playerUserId, name, isAdmin });

	// create auth row
	await db.insert(authUser).values({
		id: authUserId,
		username: name,
		passwordHash,
		playerUserId
	});

	const session = await lucia.createSession(authUserId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});

	return json({
		userId: playerUserId,
		userName: name,
		isReturningUser: false,
		isAdmin
	});
};

// Optional helper for GET logout redirect (not used by UI)
export const GET = async () => {
	throw redirect(302, '/login');
};
