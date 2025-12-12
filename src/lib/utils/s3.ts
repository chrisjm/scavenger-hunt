// ABOUTME: Provides minimal S3 helpers for uploading, fetching, and deleting objects.
// ABOUTME: Centralizes S3 client configuration from environment variables.

import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import {
	AWS_REGION as AWS_REGION_ENV,
	S3_BUCKET as S3_BUCKET_ENV,
	S3_PREFIX as S3_PREFIX_ENV
} from '$env/static/private';

const S3_BUCKET = S3_BUCKET_ENV;
const S3_REGION = AWS_REGION_ENV;
const S3_PREFIX = S3_PREFIX_ENV ?? '';

const s3 = new S3Client({ region: S3_REGION });

export function buildPublicUrl(key: string): string {
	return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

export function buildObjectKey(filename: string): string {
	const prefix = S3_PREFIX && !S3_PREFIX.endsWith('/') ? `${S3_PREFIX}/` : S3_PREFIX || '';
	return `${prefix}${filename}`;
}

interface UploadBufferParams {
	buffer: Buffer;
	contentType: string;
	key: string;
}

export async function uploadBufferToS3({
	buffer,
	contentType,
	key
}: UploadBufferParams): Promise<string> {
	const put = new PutObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
		Body: buffer,
		ContentType: contentType,
		ACL: 'public-read'
	});
	await s3.send(put);
	return buildPublicUrl(key);
}

export async function deleteFromS3(key: string): Promise<void> {
	const del = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
	await s3.send(del);
}

export async function fetchObjectBuffer(key: string): Promise<Buffer> {
	const get = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
	const res = await s3.send(get);
	const stream = res.Body as Readable | undefined;
	if (!stream) return Buffer.alloc(0);

	const readable = stream instanceof Readable ? stream : Readable.from(stream as any);
	const chunks: Buffer[] = [];
	for await (const chunk of readable) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export function extractKeyFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.pathname.replace(/^\//, '');
	} catch {
		return url.startsWith('/') ? url.slice(1) : url;
	}
}
