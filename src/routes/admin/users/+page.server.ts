// ABOUTME: Protects the admin users page behind authentication and admin authorization.
// ABOUTME: Redirects non-admin visitors to the main tasks page.

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
  if (!locals.user.isAdmin) {
    throw redirect(303, '/tasks');
  }
  return {};
};
