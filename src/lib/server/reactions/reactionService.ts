// ABOUTME: Encapsulates submission reaction mutations for reuse across API routes.
// ABOUTME: Validates curated emoji set, handles deduplication, and records audit events.

import { and, eq } from 'drizzle-orm';
import { db as defaultDb, schema } from '$lib/server/db';

export const REACTION_EMOJIS = ['🎉', '🔥', '💡', '😂', '❤️'] as const;

type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ReactionDbClient = typeof defaultDb;

interface BaseReactionParams {
	submissionId: string;
	userId: string;
	emoji: string;
}

function assertSupportedEmoji(emoji: string): asserts emoji is ReactionEmoji {
	if (!REACTION_EMOJIS.includes(emoji as ReactionEmoji)) {
		throw new Error(`Unsupported reaction emoji: ${emoji}`);
	}
}

export async function addReaction(
	params: BaseReactionParams,
	{ db = defaultDb }: { db?: ReactionDbClient } = {}
) {
	const { submissionId, userId, emoji } = params;
	assertSupportedEmoji(emoji);

	const inserted = await db
		.insert(schema.submissionReactions)
		.values({ submissionId, userId, emoji })
		.onConflictDoNothing()
		.returning();

	if (inserted.length > 0) {
		await db.insert(schema.submissionReactionEvents).values({
			submissionId,
			userId,
			emoji,
			action: 'add'
		});
	}

	return inserted[0] ?? null;
}

export async function removeReaction(
	params: BaseReactionParams,
	{ db = defaultDb }: { db?: ReactionDbClient } = {}
) {
	const { submissionId, userId, emoji } = params;
	assertSupportedEmoji(emoji);

	const deleted = await db
		.delete(schema.submissionReactions)
		.where(
			and(
				eq(schema.submissionReactions.submissionId, submissionId),
				eq(schema.submissionReactions.userId, userId),
				eq(schema.submissionReactions.emoji, emoji)
			)
		)
		.returning();

	if (deleted.length > 0) {
		await db.insert(schema.submissionReactionEvents).values({
			submissionId,
			userId,
			emoji,
			action: 'remove'
		});
	}

	return deleted[0] ?? null;
}
