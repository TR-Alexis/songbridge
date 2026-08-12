import { Request, Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { upsertProviderAccount } from '../lib/providerAccount';
import { consumeOAuthState, createOAuthState } from '../lib/oauthState';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { clearSessionCookie, getSessionToken, setSessionCookie } from '../lib/session';

const router = Router();
const spotifyProvider = new SpotifyProvider();
const youtubeProvider = new YouTubeProvider();

function buildJwt(userId: string) {
  const secret = process.env.JWT_SECRET as jwt.Secret;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const expiresIn = (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];
  const options: jwt.SignOptions = { expiresIn };
  return jwt.sign({ userId }, secret, options);
}

async function findOrCreateUserByEmail(email: string | undefined, displayName?: string) {
  if (email) {
    return prisma.user.upsert({
      where: { email },
      update: { displayName: displayName ?? undefined },
      create: { email, displayName: displayName ?? undefined },
    });
  }

  return prisma.user.create({ data: { displayName: displayName ?? undefined } });
}

function getSessionUserId(req: Request): string | undefined {
  const token = getSessionToken(req);
  if (!token) return undefined;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  try {
    const payload = jwt.verify(token, secret) as { userId?: string };
    return payload.userId;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) return undefined;
    throw error;
  }
}

router.get('/session', authGuard, (req: AuthenticatedRequest, res) => {
  res.json({ user: { id: req.user!.id, email: req.user!.email, displayName: req.user!.displayName } });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.post('/spotify/start', (req, res) => {
  const state = createOAuthState(res, 'spotify', getSessionUserId(req));
  res.json({ authorizeUrl: spotifyProvider.getAuthorizeUrl(state) });
});

router.post('/google/start', (req, res) => {
  const state = createOAuthState(res, 'youtube', getSessionUserId(req));
  res.json({ authorizeUrl: youtubeProvider.getAuthorizeUrl(state) });
});

router.get('/spotify/login', (req, res) => {
  const state = createOAuthState(res, 'spotify');
  res.redirect(spotifyProvider.getAuthorizeUrl(state));
});

router.get('/spotify/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const state = consumeOAuthState(req, res, 'spotify');

    const response = await spotifyProvider.exchangeCode(code);
    const profile = response.profile;

    const user = state.userId
      ? await prisma.user.findUniqueOrThrow({ where: { id: state.userId } })
      : await findOrCreateUserByEmail(profile.email, profile.displayName);
    await upsertProviderAccount(user.id, 'spotify', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    setSessionCookie(res, token);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    next(error);
  }
});

router.get('/google/login', (req, res) => {
  const state = createOAuthState(res, 'youtube');
  res.redirect(youtubeProvider.getAuthorizeUrl(state));
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing Google code' });
    const state = consumeOAuthState(req, res, 'youtube');

    const response = await youtubeProvider.exchangeCode(code);
    const profile = response.profile;

    const user = state.userId
      ? await prisma.user.findUniqueOrThrow({ where: { id: state.userId } })
      : await findOrCreateUserByEmail(profile.email, profile.displayName);
    await upsertProviderAccount(user.id, 'youtube', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    setSessionCookie(res, token);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    next(error);
  }
});

export default router;
