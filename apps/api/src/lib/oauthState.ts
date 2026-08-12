import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type OAuthProvider = 'spotify' | 'youtube';

interface OAuthStatePayload {
  nonce: string;
  provider: OAuthProvider;
  userId?: string;
}

const COOKIE_NAME = 'songbridge_oauth_state';

function getSecret(): jwt.Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function parseCookies(req: Request): Record<string, string> {
  return Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((cookie) => cookie.trim().split('='))
      .filter(([name, value]) => Boolean(name && value))
      .map(([name, value]) => [name, decodeURIComponent(value)]),
  );
}

export function createOAuthState(res: Response, provider: OAuthProvider, userId?: string): string {
  const nonce = crypto.randomBytes(32).toString('hex');
  const state = jwt.sign({ nonce, provider, userId } satisfies OAuthStatePayload, getSecret(), { expiresIn: '10m' });

  res.cookie(COOKIE_NAME, nonce, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
  });

  return state;
}

export function consumeOAuthState(req: Request, res: Response, expectedProvider: OAuthProvider): OAuthStatePayload {
  const state = String(req.query.state || '');
  const cookieNonce = parseCookies(req)[COOKIE_NAME];

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
  });

  if (!state || !cookieNonce) throw new Error('Invalid or expired OAuth state');

  const payload = jwt.verify(state, getSecret()) as OAuthStatePayload;
  const nonceMatches = payload.nonce.length === cookieNonce.length && crypto.timingSafeEqual(Buffer.from(payload.nonce), Buffer.from(cookieNonce));
  if (!nonceMatches || payload.provider !== expectedProvider) throw new Error('Invalid or expired OAuth state');

  return payload;
}
