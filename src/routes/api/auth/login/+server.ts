// ABOUTME: Handles user login and registration for the scavenger hunt via API.
// ABOUTME: Issues auth_token cookies backed by database sessions instead of JWTs.

import crypto from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { db, schema } from '$lib/server/db';
import { createSessionForUser } from '$lib/server/session';

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 9; // must be > 8

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const { name, password, isReturningUser = false } = (body ?? {}) as {
      name?: unknown;
      password?: unknown;
      isReturningUser?: unknown;
    };

    if (typeof name !== 'string' || typeof password !== 'string') {
      return json({ error: 'Invalid payload' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < USERNAME_MIN || trimmedName.length > USERNAME_MAX) {
      return json(
        { error: `Name must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` },
        { status: 400 }
      );
    }

    if (password.length < PASSWORD_MIN) {
      return json({ error: 'Password must be more than 8 characters' }, { status: 400 });
    }

    const { authUsers: authUserTable, userProfiles } = schema;

    if (isReturningUser) {
      const usernameLower = trimmedName.toLowerCase();

      const [existingAuthUser] = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.username, usernameLower))
        .limit(1);

      if (!existingAuthUser) {
        return json(
          {
            error: 'User not found',
            message: `No user found with the name "${trimmedName}". Please check your spelling or create a new account.`
          },
          { status: 404 }
        );
      }

      const passwordValid = await verify(existingAuthUser.passwordHash, password).catch(
        () => false
      );
      if (!passwordValid) {
        return json({ error: 'Incorrect password' }, { status: 400 });
      }

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, existingAuthUser.profileId))
        .limit(1);

      const isAdmin = profile?.isAdmin ?? false;
      const session = await createSessionForUser(existingAuthUser.id);

      cookies.set('auth_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return json({
        userId: existingAuthUser.profileId,
        userName: profile?.displayName ?? existingAuthUser.username,
        isReturningUser: true,
        isAdmin
      });
    }

    // New user flow
    const usernameLower = trimmedName.toLowerCase();

    const [existingAuthUser] = await db
      .select()
      .from(authUserTable)
      .where(eq(authUserTable.username, usernameLower))
      .limit(1);

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
    const profileId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();

    // Create profile row (new users default to non-admin)
    const isAdmin = false;
    await db.insert(userProfiles).values({ id: profileId, displayName: trimmedName, isAdmin });

    // Create auth row
    await db.insert(authUserTable).values({
      id: authUserId,
      username: usernameLower,
      passwordHash,
      profileId
    });

    const session = await createSessionForUser(authUserId);

    cookies.set('auth_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return json({
      userId: profileId,
      userName: trimmedName,
      isReturningUser: false,
      isAdmin
    });
  } catch (error) {
    console.error('Auth login error (SvelteKit):', error);
    return json({ error: 'Login failed' }, { status: 500 });
  }
};
