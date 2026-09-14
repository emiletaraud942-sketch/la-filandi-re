// Compatible Edge Runtime (utilisé par middleware.ts) : ne dépend que de
// `jose` (Web Crypto), jamais de bcrypt qui nécessite le runtime Node.
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

export type Role = 'manager' | 'agent';

export interface SessionPayload {
  uid: number; // users.id
  username: string;
  role: Role;
  teamMemberId: number | null;
  mustChangePassword: boolean;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET manquant ou trop court. Définissez une variable d\'environnement SESSION_SECRET (32+ caractères aléatoires) dans les réglages Vercel.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.uid === 'number' &&
      typeof payload.username === 'string' &&
      (payload.role === 'manager' || payload.role === 'agent')
    ) {
      return {
        uid: payload.uid,
        username: payload.username,
        role: payload.role,
        teamMemberId: (payload.teamMemberId as number | null) ?? null,
        mustChangePassword: Boolean(payload.mustChangePassword),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
