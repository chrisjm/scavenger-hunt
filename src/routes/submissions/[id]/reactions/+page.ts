import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { SubmissionReactionDetailPayload } from '$lib/types/submission';

export const load: PageLoad = async ({ fetch, params }) => {
  const response = await fetch(`/api/submissions/${params.id}/reactions`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to load reactions' }));
    throw error(response.status, data.error ?? 'Failed to load reactions');
  }

  const payload = (await response.json()) as SubmissionReactionDetailPayload;

  return {
    submission: payload.submission,
    reactions: payload.reactions,
    viewerReactions: payload.viewerReactions,
    availableEmojis: payload.availableEmojis
  };
};
