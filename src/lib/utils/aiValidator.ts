// ABOUTME: Performs AI validation of images using Gemini given a buffer or path.
// ABOUTME: Returns match/confidence/reasoning, falling back safely on errors.

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { env } from '$env/dynamic/private';

const isCI = process.env.CI === 'true';
const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY && !isCI) {
	throw new Error(
		'GEMINI_API_KEY is not set in environment variables. Make sure to set it in your .env file.'
	);
}

if (!GEMINI_API_KEY && isCI) {
	console.warn('GEMINI_API_KEY not set in CI; AI validation is disabled during build.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface AiValidationResult {
	totalScore: number;
	breakdown: {
		accuracy: number;
		composition: number;
		vibe: number;
	};
	aiComment: string;
	isApproved: boolean;
}

interface TaskLike {
	aiPrompt: string;
}

type RawJudgeResponse = {
	score?: unknown;
	breakdown?: {
		accuracy?: unknown;
		composition?: unknown;
		vibe?: unknown;
	};
	is_approved?: unknown;
	isApproved?: unknown;
	comment?: unknown;
};

/**
 * Validates an image against a task using Gemini AI.
 * @param imageSource File path or in-memory buffer
 * @param task Task object with aiPrompt and minConfidence
 */
export async function validateImageWithAI(
	imageSource: string | Buffer,
	task: TaskLike
): Promise<AiValidationResult> {
	if (!genAI) {
		throw new Error('GEMINI_API_KEY is not configured; AI validation is unavailable.');
	}
	try {
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.0-flash-exp',
			generationConfig: {
				responseMimeType: 'application/json'
			}
		});

		const imageBuffer =
			typeof imageSource === 'string' ? fs.readFileSync(imageSource) : imageSource;
		const imageBase64 = imageBuffer.toString('base64');

		const prompt = `
### ROLE
You are the "Holiday Huntmaster," a witty, spirited, and slightly sarcastic AI judge for a Scavenger Hunt game.

### GOAL
Analyze the user's photo against the task description. Output a JSON object with a score (0-100) and commentary.

### TASK DESCRIPTION
${task.aiPrompt}

### SCORING ALGORITHM
1. ACCURACY (Max 50 pts):
   - 0 pts: Item missing/unrelated.
   - 25 pts: Item present but debatable/hard to see.
   - 50 pts: Item clearly visible.
   CRITICAL: If Accuracy is 0, Total Score must be 0.

2. COMPOSITION (Max 25 pts):
   - Reward good lighting, framing, and focus.
   - Deduct for blurry/dark photos.

3. THE VIBE (Max 25 pts):
   - Bonus for creativity, humor, and local flavor.

### OUTPUT FORMAT (JSON ONLY)
{
  "score": integer,
  "breakdown": {
    "accuracy": integer,
    "composition": integer,
    "vibe": integer
  },
  "is_approved": boolean, // true if accuracy >= 25
  "comment": "string"
}
		`.trim();

		const result = await model.generateContent([
			prompt,
			{
				inlineData: {
					data: imageBase64,
					mimeType: 'image/jpeg'
				}
			}
		]);

		const response = result.response;
		const text = response.text();

		try {
			const aiResponse = JSON.parse(text) as RawJudgeResponse;
			return normalizeJudgeResponse(aiResponse);
		} catch (parseError) {
			console.error('Failed to parse AI response:', text, parseError);
			return buildFailureResult('AI returned invalid JSON response');
		}
	} catch (error) {
		console.error('AI validation error:', error);
		return buildFailureResult(
			`AI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

const DEFAULT_BREAKDOWN = Object.freeze({
	accuracy: 0,
	composition: 0,
	vibe: 0
});
const FALLBACK_COMMENT = 'The judges are confused. Please try again.';

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function buildFailureResult(reason: string): AiValidationResult {
	return {
		totalScore: 0,
		breakdown: { ...DEFAULT_BREAKDOWN },
		aiComment: reason || FALLBACK_COMMENT,
		isApproved: false
	};
}

function ensureNumber(value: unknown): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new Error('Invalid AI response structure');
	}

	return value;
}

export function normalizeJudgeResponse(payload: RawJudgeResponse): AiValidationResult {
	if (!payload || typeof payload !== 'object' || payload === null) {
		throw new Error('Invalid AI response structure');
	}

	const rawBreakdown = payload.breakdown;
	if (!rawBreakdown || typeof rawBreakdown !== 'object') {
		throw new Error('Invalid AI response structure');
	}

	const accuracy = clamp(ensureNumber(rawBreakdown.accuracy), 0, 50);
	const composition = clamp(ensureNumber(rawBreakdown.composition), 0, 25);
	const vibe = clamp(ensureNumber(rawBreakdown.vibe), 0, 25);

	let totalScore = clamp(ensureNumber(payload.score), 0, 100);
	let isApproved =
		typeof payload.isApproved === 'boolean'
			? payload.isApproved
			: typeof payload.is_approved === 'boolean'
				? payload.is_approved
				: accuracy >= 25;

	if (accuracy === 0) {
		totalScore = 0;
		isApproved = false;
	}

	const aiComment =
		typeof payload.comment === 'string' && payload.comment.trim()
			? payload.comment.trim()
			: FALLBACK_COMMENT;

	return {
		totalScore,
		breakdown: {
			accuracy,
			composition,
			vibe
		},
		aiComment,
		isApproved
	};
}

/**
 * Determines if a submission is valid based on AI response.
 */
export function isSubmissionValid(aiResponse: AiValidationResult): boolean {
	return aiResponse.isApproved;
}
