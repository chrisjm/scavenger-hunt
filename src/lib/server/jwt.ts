import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables.');
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(JWT_SECRET);
const ISSUER = 'scavenger-hunt';

export interface AuthTokenPayload {
  userId: string; // player user id
  authId: string | null;
  username: string | null;
  isAdmin: boolean;
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  const { userId, authId, username, isAdmin } = payload;

  return await new SignJWT({
    sub: userId,
    authId,
    username,
    isAdmin
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { issuer: ISSUER });

    if (typeof payload.sub !== 'string') {
      return null;
    }

    return {
      userId: payload.sub,
      authId: typeof payload.authId === 'string' ? payload.authId : null,
      username: typeof payload.username === 'string' ? payload.username : null,
      isAdmin: Boolean(payload.isAdmin)
    };
  } catch {
    return null;
  }
}
