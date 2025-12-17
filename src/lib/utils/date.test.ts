// ABOUTME: Unit tests for date formatting helpers.
// ABOUTME: Uses mocked date-fns and Date.now for deterministic behavior.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const formatMock = vi.fn();
const formatDistanceToNowMock = vi.fn();

vi.mock('date-fns', () => ({
  format: formatMock,
  formatDistanceToNow: formatDistanceToNowMock
}));

let formatRelativeOrDate: typeof import('./date').formatRelativeOrDate;
let formatShortDate: typeof import('./date').formatShortDate;
let formatSubmittedAt: typeof import('./date').formatSubmittedAt;

beforeAll(async () => {
  ({ formatRelativeOrDate, formatShortDate, formatSubmittedAt } = await import('./date'));
});

beforeEach(() => {
  formatMock.mockReset();
  formatDistanceToNowMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatRelativeOrDate', () => {
  it('returns empty string for invalid dates', () => {
    const out = formatRelativeOrDate('not-a-date');
    expect(out).toBe('');
    expect(formatMock).not.toHaveBeenCalled();
    expect(formatDistanceToNowMock).not.toHaveBeenCalled();
  });

  it('uses relative formatting for dates within 7 days', () => {
    const now = Date.parse('2020-01-10T00:00:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    formatDistanceToNowMock.mockReturnValueOnce('2 days ago');

    const input = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const out = formatRelativeOrDate(input);
    expect(out).toBe('2 days ago');
    expect(formatDistanceToNowMock).toHaveBeenCalledTimes(1);
    expect(formatMock).not.toHaveBeenCalled();
  });

  it('uses absolute formatting for dates 7+ days away', () => {
    const now = Date.parse('2020-01-10T00:00:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    formatMock.mockReturnValueOnce('01/01/2020');

    const input = new Date(now - 8 * 24 * 60 * 60 * 1000);
    const out = formatRelativeOrDate(input);
    expect(out).toBe('01/01/2020');
    expect(formatMock).toHaveBeenCalledTimes(1);
    expect(formatMock).toHaveBeenCalledWith(input, 'MM/dd/yyyy');
  });
});

describe('formatShortDate', () => {
  it('returns empty string for invalid dates', () => {
    const out = formatShortDate('not-a-date');
    expect(out).toBe('');
  });

  it('formats as MM/dd', () => {
    formatMock.mockReturnValueOnce('01/10');
    const input = new Date('2020-01-10T00:00:00Z');
    const out = formatShortDate(input);
    expect(out).toBe('01/10');
    expect(formatMock).toHaveBeenCalledWith(input, 'MM/dd');
  });
});

describe('formatSubmittedAt', () => {
  it('returns empty string for invalid dates', () => {
    const out = formatSubmittedAt('not-a-date');
    expect(out).toBe('');
  });

  it('formats as MM/dd/yyyy at h:mm a', () => {
    formatMock
      .mockImplementationOnce(() => '01/10/2020')
      .mockImplementationOnce(() => '3:04 PM');

    const input = new Date('2020-01-10T15:04:00Z');
    const out = formatSubmittedAt(input);
    expect(out).toBe('01/10/2020 at 3:04 PM');
    expect(formatMock).toHaveBeenNthCalledWith(1, input, 'MM/dd/yyyy');
    expect(formatMock).toHaveBeenNthCalledWith(2, input, 'h:mm a');
  });
});
