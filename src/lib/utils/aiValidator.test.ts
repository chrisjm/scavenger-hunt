// ABOUTME: Unit tests covering AI scoring normalization logic and validity gating.
// ABOUTME: Ensures  Huntmaster responses stay within expected ranges.

import { describe, expect, it } from 'vitest';
import { isSubmissionValid, normalizeJudgeResponse } from './aiValidator';

describe('normalizeJudgeResponse', () => {
  it('sanitizes a valid payload and clamps component scores', () => {
    const result = normalizeJudgeResponse({
      score: 95,
      breakdown: {
        accuracy: 48,
        composition: 30,
        vibe: 26
      },
      is_approved: true,
      comment: '  Nailed it!  '
    });

    expect(result.totalScore).toBe(95);
    expect(result.breakdown).toEqual({
      accuracy: 48,
      composition: 25,
      vibe: 25
    });
    expect(result.aiComment).toBe('Nailed it!');
    expect(result.isApproved).toBe(true);
  });

  it('forces zero totals and rejection when accuracy is zero', () => {
    const result = normalizeJudgeResponse({
      score: 60,
      breakdown: {
        accuracy: 0,
        composition: 20,
        vibe: 20
      },
      comment: 'Maybe try again?'
    });

    expect(result.totalScore).toBe(0);
    expect(result.isApproved).toBe(false);
  });

  it('throws when payload is missing required fields', () => {
    expect(() =>
      normalizeJudgeResponse({
        score: 'not-a-number',
        comment: 42
      } as unknown as Record<string, unknown>)
    ).toThrowError('Invalid AI response structure');
  });
});

describe('isSubmissionValid', () => {
  it('returns the approval flag from the AI response', () => {
    const parsed = normalizeJudgeResponse({
      score: 80,
      breakdown: {
        accuracy: 40,
        composition: 20,
        vibe: 20
      },
      is_approved: true,
      comment: 'Festive greatness detected.'
    });

    expect(isSubmissionValid(parsed)).toBe(true);
  });
});
