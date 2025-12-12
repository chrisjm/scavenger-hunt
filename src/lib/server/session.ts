// ABOUTME: Implements database-backed session tokens for authentication.
// ABOUTME: Provides helpers to create, validate, and delete auth sessions.

import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateSecureRandomString(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(24); // 192 bits
  let id = '';
  for (let i = 0; i < bytes.length; i += 1) {
    id += alphabet[bytes[i] >> 3];
  }
  return id;
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('base64');
}

function constantTimeEqualHash(aBase64: string, bBase64: string): boolean {
  const a = Buffer.from(aBase64, 'base64');
  const b = Buffer.from(bBase64, 'base64');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createSessionForUser(authUserId: string) {
  const now = new Date();
  const id = generateSecureRandomString();
  const secret = generateSecureRandomString();
  const secretHash = hashSecret(secret);

  await db.insert(schema.sessions).values({
    id,
    userId: authUserId,
    secretHash,
    createdAt: now
  });

  return {
    sessionId: id,
    token: `${id}.${secret}`
  };
}

export async function validateSessionToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [sessionId, secret] = parts;
  let session:
    | {
      id: string;
      userId: string;
      secretHash: string;
      createdAt: Date | number;
    }
    | undefined;

  try {
    [session] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1);
  } catch (error) {
    console.error('validateSessionToken failed to query sessions table:', error);
    return null;
  }

  if (!session) return null;

  const now = Date.now();
  const createdAt = session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt);
  if (now - createdAt.getTime() >= SESSION_TTL_MS) {
    await deleteSession(session.id);
    return null;
  }

  const candidateHash = hashSecret(secret);
  const valid = constantTimeEqualHash(candidateHash, session.secretHash);
  if (!valid) return null;

  return session;
}

export async function deleteSession(sessionId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}
