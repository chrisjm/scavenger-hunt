import express from 'express';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { db, schema } from '../utils/database.js';
import { signAuthToken, verifyAuthToken } from '../utils/jwt.js';

const router = express.Router();
const { user: authUser, users: playerUsers } = schema;

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 9; // must be > 8

// Admin IDs from env (UUIDs)
const adminIdsEnv = (process.env.ADMIN_USER_IDS || '')
	.split(',')
	.map((id) => id.trim())
	.filter(Boolean);
const ADMIN_ID_SET = new Set(adminIdsEnv);

// POST /api/auth/login
router.post('/login', async (req, res) => {
	try {
		const { name, password, isReturningUser = false } = req.body ?? {};

		if (typeof name !== 'string' || typeof password !== 'string') {
			return res.status(400).json({ error: 'Invalid payload' });
		}

		const trimmedName = name.trim();
		if (trimmedName.length < USERNAME_MIN || trimmedName.length > USERNAME_MAX) {
			return res
				.status(400)
				.json({ error: `Name must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` });
		}

		if (password.length < PASSWORD_MIN) {
			return res.status(400).json({ error: 'Password must be more than 8 characters' });
		}

		// Look up existing auth user by username
		const [existingAuthUser] = await db
			.select()
			.from(authUser)
			.where(eq(authUser.username, trimmedName))
			.limit(1);

		if (isReturningUser) {
			if (!existingAuthUser) {
				return res.status(404).json({
					error: 'User not found',
					message: `No user found with the name "${trimmedName}". Please check your spelling or create a new account.`
				});
			}

			const passwordValid = await verify(existingAuthUser.passwordHash, password).catch(
				() => false
			);
			if (!passwordValid) {
				return res.status(400).json({ error: 'Incorrect password' });
			}

			// Fetch the player row to get isAdmin
			const [player] = await db
				.select()
				.from(playerUsers)
				.where(eq(playerUsers.id, existingAuthUser.playerUserId))
				.limit(1);

			const token = await signAuthToken({
				userId: existingAuthUser.playerUserId,
				authId: existingAuthUser.id,
				username: existingAuthUser.username,
				isAdmin: player?.isAdmin ?? false
			});

			res.cookie('auth_token', token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/'
			});

			return res.json({
				userId: existingAuthUser.playerUserId,
				userName: existingAuthUser.username,
				isReturningUser: true,
				isAdmin: player?.isAdmin ?? false
			});
		}

		// New user flow
		if (existingAuthUser) {
			return res.status(409).json({
				error: 'Name already taken',
				message: 'This name is already taken. Please choose a different name.'
			});
		}

		const passwordHash = await hash(password);
		const playerUserId = crypto.randomUUID();
		const authUserId = crypto.randomUUID();

		// Compute admin flag from env
		const isAdmin = ADMIN_ID_SET.has(playerUserId);

		// Create player row
		await db.insert(playerUsers).values({ id: playerUserId, name: trimmedName, isAdmin });

		// Create auth row
		await db.insert(authUser).values({
			id: authUserId,
			username: trimmedName,
			passwordHash,
			playerUserId
		});

		const token = await signAuthToken({
			userId: playerUserId,
			authId: authUserId,
			username: trimmedName,
			isAdmin
		});

		res.cookie('auth_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/'
		});

		return res.json({
			userId: playerUserId,
			userName: trimmedName,
			isReturningUser: false,
			isAdmin
		});
	} catch (error) {
		console.error('Auth login error:', error);
		return res.status(500).json({ error: 'Login failed' });
	}
});

// POST /api/auth/logout
router.post('/logout', async (_req, res) => {
	res.cookie('auth_token', '', {
		expires: new Date(0),
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax'
	});
	return res.status(200).json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
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

		return res.json({
			userId: payload.userId,
			userName: payload.username,
			isAdmin: payload.isAdmin
		});
	} catch (error) {
		console.error('Auth me error:', error);
		return res.status(500).json({ error: 'Failed to fetch current user' });
	}
});

export default router;
