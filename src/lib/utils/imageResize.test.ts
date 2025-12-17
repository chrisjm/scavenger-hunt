// ABOUTME: Unit tests for imageResize formatting helpers.
// ABOUTME: Covers formatFileSize which is pure and used for UI display.

import { describe, expect, it } from 'vitest';
import { formatFileSize } from './imageResize';

describe('formatFileSize', () => {
	it('formats 0 bytes', () => {
		expect(formatFileSize(0)).toBe('0 B');
	});

	it('formats bytes', () => {
		expect(formatFileSize(12)).toBe('12 B');
	});

	it('formats KB with rounding', () => {
		expect(formatFileSize(1024)).toBe('1 KB');
		expect(formatFileSize(1536)).toBe('1.5 KB');
	});

	it('formats MB with rounding', () => {
		expect(formatFileSize(1024 * 1024)).toBe('1 MB');
	});
});
