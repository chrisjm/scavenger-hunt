// ABOUTME: Unit tests for unlock date helpers.
// ABOUTME: Ensures rounded datetime strings and interval rounding are accurate.

import { describe, expect, it } from 'vitest';

import {
	formatDatetimeLocal,
	getRoundedLocalDatetimeLocalString,
	roundDownToInterval
} from './unlockDate.ts';

describe('unlock date helpers', () => {
	it('rounds down to nearest 15-minute interval by default', () => {
		const date = new Date(2024, 2, 10, 14, 37, 59, 500);
		const rounded = roundDownToInterval(date);
		expect(rounded.getHours()).toBe(14);
		expect(rounded.getMinutes()).toBe(30);
		expect(rounded.getSeconds()).toBe(0);
		expect(rounded.getMilliseconds()).toBe(0);
	});

	it('formats datetime values for datetime-local inputs', () => {
		const date = new Date(2024, 8, 5, 9, 2);
		expect(formatDatetimeLocal(date)).toBe('2024-09-05T09:02');
	});

	it('returns rounded datetime-local string for now by default', () => {
		const now = new Date(2024, 10, 1, 16, 44);
		const result = getRoundedLocalDatetimeLocalString(now);
		expect(result).toBe('2024-11-01T16:30');
	});
});
