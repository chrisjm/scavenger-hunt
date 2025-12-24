// ABOUTME: Normalizes submission scoring data and provides safe defaults for AI output.
// ABOUTME: Shared by submission APIs to parse score breakdown JSON consistently.

export const DEFAULT_AI_COMMENT = 'The judges are confused. Please try again.';

export const EMPTY_BREAKDOWN = Object.freeze({
	accuracy: 0,
	composition: 0,
	vibe: 0
});

export function parseScoreBreakdown(raw: string | null | undefined) {
	if (!raw) {
		return { ...EMPTY_BREAKDOWN };
	}
	try {
		const parsed = JSON.parse(raw) as {
			accuracy?: number;
			composition?: number;
			vibe?: number;
		};
		return {
			accuracy: Number.isFinite(parsed.accuracy) ? Number(parsed.accuracy) : 0,
			composition: Number.isFinite(parsed.composition) ? Number(parsed.composition) : 0,
			vibe: Number.isFinite(parsed.vibe) ? Number(parsed.vibe) : 0
		};
	} catch {
		return { ...EMPTY_BREAKDOWN };
	}
}

export function normalizeSubmissionRow<
	T extends {
		scoreBreakdown: string | null;
		totalScore: number | null;
		aiComment: string | null;
		aiReasoning?: string | null;
	}
>(row: T) {
	return {
		...row,
		totalScore: row.totalScore ?? 0,
		scoreBreakdown: parseScoreBreakdown(row.scoreBreakdown),
		aiComment: row.aiComment ?? row.aiReasoning ?? DEFAULT_AI_COMMENT
	};
}
