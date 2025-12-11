// ABOUTME: Handles user logout by clearing auth_token and deleting the backing session.
// ABOUTME: Ensures authenticated state is removed for subsequent requests.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, validateSessionToken } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    const token = cookies.get('auth_token');

    if (token) {
      const session = await validateSessionToken(token);
      if (session) {
        await deleteSession(session.id);
      }
    }

    cookies.set('auth_token', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return json({ success: true });
  } catch (error) {
    console.error('Auth logout error (SvelteKit):', error);
    return json({ error: 'Logout failed' }, { status: 500 });
  }
};
