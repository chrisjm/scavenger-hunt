// ABOUTME: Provides minimal S3 helpers for uploading, fetching, and deleting objects.
// ABOUTME: Centralizes S3 client configuration from environment variables.
import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const requiredEnv = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
	throw new Error(`Missing required S3 env vars: ${missing.join(', ')}`);
}

const S3_BUCKET = process.env.S3_BUCKET;
const S3_PREFIX = process.env.S3_PREFIX || '';
const S3_REGION = process.env.AWS_REGION;

const s3 = new S3Client({ region: S3_REGION });

export function buildPublicUrl(key) {
	return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

export function buildObjectKey(filename) {
	const prefix = S3_PREFIX && !S3_PREFIX.endsWith('/') ? `${S3_PREFIX}/` : S3_PREFIX || '';
	return `${prefix}${filename}`;
}

export async function uploadBufferToS3({ buffer, contentType, key }) {
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

export async function deleteFromS3(key) {
	const del = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
	await s3.send(del);
}

export async function fetchObjectBuffer(key) {
	const get = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
	const res = await s3.send(get);
	const stream = res.Body;
	const chunks = [];
	for await (const chunk of stream instanceof Readable ? stream : Readable.from(stream)) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

export function extractKeyFromUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.pathname.replace(/^\//, '');
	} catch {
		return url.startsWith('/') ? url.slice(1) : url;
	}
}
