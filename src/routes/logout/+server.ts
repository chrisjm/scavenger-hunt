import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';

export const POST = async ({ locals, cookies }) => {
	if (!locals.session) {
		return new Response('Unauthorized', { status: 401 });
	}

	await lucia.invalidateSession(locals.session.id);
	const blank = lucia.createBlankSessionCookie();
	cookies.set(blank.name, blank.value, { path: '.', ...blank.attributes });

	throw redirect(302, '/login');
};
