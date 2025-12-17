// ABOUTME: Unit tests for S3 helper URL parsing.
// ABOUTME: Focuses on extractKeyFromUrl without performing any AWS network calls.

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('@aws-sdk/client-s3', () => ({
	S3Client: class {
		send = vi.fn();
	},
	PutObjectCommand: class {},
	DeleteObjectCommand: class {},
	GetObjectCommand: class {}
}));

let extractKeyFromUrl: typeof import('./s3').extractKeyFromUrl;

beforeAll(async () => {
	({ extractKeyFromUrl } = await import('./s3'));
});

describe('extractKeyFromUrl', () => {
	it('extracts key from full https URL', () => {
		const key = extractKeyFromUrl('https://bucket.s3.us-east-1.amazonaws.com/library/foo.jpg');
		expect(key).toBe('library/foo.jpg');
	});

	it('removes leading slash from pathname-only values', () => {
		const key = extractKeyFromUrl('/library/foo.jpg');
		expect(key).toBe('library/foo.jpg');
	});

	it('returns key as-is for non-URL strings', () => {
		const key = extractKeyFromUrl('library/foo.jpg');
		expect(key).toBe('library/foo.jpg');
	});

	it('handles invalid URLs gracefully', () => {
		const key = extractKeyFromUrl('not a url /library/foo.jpg');
		expect(key).toBe('not a url /library/foo.jpg');
	});
});
