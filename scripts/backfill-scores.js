import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { submissions } from '../src/lib/server/db/schema.ts';

function normalizeDatabaseUrl(url) {
	const trimmed = String(url ?? '').trim();
	if (
		trimmed.startsWith('libsql://') ||
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('file:')
	) {
		return trimmed;
	}

	return `file:${trimmed || 'local.db'}`;
}

const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || 'local.db');
const client = createClient({
	url: dbUrl,
	authToken: process.env.DATABASE_AUTH_TOKEN
});
const db = drizzle(client);

const APPROVED_BACKFILL = {
	score: 50,
	breakdown: JSON.stringify({ accuracy: 50, composition: 0, vibe: 0 }),
	comment: 'Legacy submission. Approved by the Council of Elders.'
};

const REJECTED_BACKFILL = {
	score: 0,
	breakdown: JSON.stringify({ accuracy: 0, composition: 0, vibe: 0 }),
	comment: 'Legacy submission. Rejected.'
};

async function backfillScores() {
	try {
		const [{ count: legacyCount }] = await db
			.select({ count: sql < number > `count(*)` })
			.from(submissions)
			.where(isNull(submissions.totalScore));

		if (legacyCount === 0) {
			console.log('✅ No legacy submissions require backfill.');
			return;
		}

		console.log(`🔧 Backfilling ${legacyCount} legacy submissions...`);

		const [approvedResult, rejectedResult, unknownResult] = await Promise.all([
			db
				.update(submissions)
				.set({
					totalScore: APPROVED_BACKFILL.score,
					scoreBreakdown: APPROVED_BACKFILL.breakdown,
					aiComment: APPROVED_BACKFILL.comment
				})
				.where(and(isNull(submissions.totalScore), eq(submissions.valid, true))),
			db
				.update(submissions)
				.set({
					totalScore: REJECTED_BACKFILL.score,
					scoreBreakdown: REJECTED_BACKFILL.breakdown,
					aiComment: REJECTED_BACKFILL.comment
				})
				.where(and(isNull(submissions.totalScore), eq(submissions.valid, false))),
			db
				.update(submissions)
				.set({
					totalScore: REJECTED_BACKFILL.score,
					scoreBreakdown: REJECTED_BACKFILL.breakdown,
					aiComment: 'Legacy submission. Status unknown; defaulting to zero points.'
				})
				.where(and(isNull(submissions.totalScore), isNull(submissions.valid)))
		]);

		const affectedRows =
			(approvedResult.changes ?? 0) + (rejectedResult.changes ?? 0) + (unknownResult.changes ?? 0);

		console.log(`🎉 Backfill complete. Updated ${affectedRows} submissions.`);
	} catch (error) {
		console.error('❌ Error backfilling submission scores:', error);
		process.exitCode = 1;
	} finally {
		client.close();
	}
}

backfillScores();
