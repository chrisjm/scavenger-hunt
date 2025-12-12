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
const S3_DEBUG =
	env.S3_DEBUG === 'true' ||
	process.env.S3_DEBUG === 'true' ||
	env.APP_DEBUG_S3 === 'true' ||
	process.env.APP_DEBUG_S3 === 'true';
const S3_OBJECT_ACL = env.S3_OBJECT_ACL || process.env.S3_OBJECT_ACL || '';

const s3 = new S3Client({
	region: S3_REGION,
	credentials: {
		accessKeyId: env.APP_AWS_ACCESS_KEY_ID || process.env.APP_AWS_ACCESS_KEY_ID || '',
		secretAccessKey: env.APP_AWS_SECRET_ACCESS_KEY || process.env.APP_AWS_SECRET_ACCESS_KEY || ''
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
	if (!S3_BUCKET) {
		throw new Error('S3_BUCKET is not set');
	}
	if (!S3_REGION) {
		throw new Error('S3 region is not set');
	}

	const input: ConstructorParameters<typeof PutObjectCommand>[0] = {
		Bucket: S3_BUCKET,
		Key: key,
		Body: buffer,
		ContentType: contentType
	};

	// Many production buckets have ACLs disabled (Object Ownership: bucket owner enforced).
	// In that case, sending any ACL (e.g. 'public-read') will fail with AccessControlListNotSupported.
	if (S3_OBJECT_ACL) {
		input.ACL = S3_OBJECT_ACL as never;
	}

	const put = new PutObjectCommand(input);
	try {
		await s3.send(put);
		return buildPublicUrl(key);
	} catch (err) {
		if (S3_DEBUG) {
			const e = err as {
				name?: string;
				message?: string;
				$metadata?: { requestId?: string; extendedRequestId?: string; httpStatusCode?: number };
			};
			console.error('S3 upload failed', {
				name: e?.name,
				message: e?.message,
				httpStatusCode: e?.$metadata?.httpStatusCode,
				requestId: e?.$metadata?.requestId,
				extendedRequestId: e?.$metadata?.extendedRequestId,
				bucketPresent: Boolean(S3_BUCKET),
				region: S3_REGION,
				key,
				contentType,
				bufferLength: buffer.length,
				aclSent: Boolean(S3_OBJECT_ACL)
			});
		}
		throw err;
	}
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
