// ABOUTME: Provides minimal S3 helpers for uploading, fetching, and deleting objects.
// ABOUTME: Centralizes S3 client configuration from environment variables.

import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { env } from '$env/dynamic/private';

const S3_BUCKET = env.S3_BUCKET || process.env.S3_BUCKET || '';
const S3_REGION =
	env.APP_AWS_REGION ||
	process.env.APP_AWS_REGION ||
	env.AWS_REGION ||
	process.env.AWS_REGION ||
	'us-east-1';
const S3_PREFIX = env.S3_PREFIX || process.env.S3_PREFIX || '';

const s3 = new S3Client({
	region: S3_REGION,
	credentials: {
		accessKeyId:
			env.APP_AWS_ACCESS_KEY_ID ||
			process.env.APP_AWS_ACCESS_KEY_ID ||
			env.AWS_ACCESS_KEY_ID ||
			process.env.AWS_ACCESS_KEY_ID ||
			'',
		secretAccessKey:
			env.APP_AWS_SECRET_ACCESS_KEY ||
			process.env.APP_AWS_SECRET_ACCESS_KEY ||
			env.AWS_SECRET_ACCESS_KEY ||
			process.env.AWS_SECRET_ACCESS_KEY ||
			''
	}
});

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

	const readable =
		stream instanceof Readable
			? stream
			: Readable.from(stream as unknown as AsyncIterable<Uint8Array> | Iterable<Uint8Array>);
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
