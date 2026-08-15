import { Request, Response } from 'express';

export const SESSION_COOKIE_NAME = 'songbridge_session';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function getSessionToken(req: Request): string | undefined {
  const bearer = req.headers.authorization;
  if (bearer?.startsWith('Bearer ')) return bearer.slice('Bearer '.length);

  const cookie = (req.headers.cookie ?? '')
    .split(';')
    .map((item) => item.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE_NAME);
  return cookie?.[1] ? decodeURIComponent(cookie[1]) : undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}
