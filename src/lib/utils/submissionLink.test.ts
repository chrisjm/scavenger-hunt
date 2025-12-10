// ABOUTME: Tests URL builder helpers for submission detail links.
// ABOUTME: Ensures submission links stay consistent for deep-linking.

import { describe, it, expect } from 'vitest';
import { buildSubmissionLink } from './submissionLink.ts';

describe('buildSubmissionLink', () => {
  it('builds URL using numeric taskId and string id', () => {
    const url = buildSubmissionLink({ taskId: 42, id: 'abc-123' });
    expect(url).toBe('/tasks/42/submission/abc-123');
  });

  it('coerces taskId from string to path segment', () => {
    const url = buildSubmissionLink({ taskId: '7' as any, id: 'id-1' });
    expect(url).toBe('/tasks/7/submission/id-1');
  });
});
