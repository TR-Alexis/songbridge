import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { upsertProviderAccount } from '../lib/providerAccount';

const router = Router();
const spotifyProvider = new SpotifyProvider();
const youtubeProvider = new YouTubeProvider();

function buildJwt(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
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

router.get('/spotify/login', (req, res) => {
  res.redirect(spotifyProvider.getAuthorizeUrl());
});

router.get('/spotify/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const response = await spotifyProvider.exchangeCode(code);
    const profile = response.profile;

    const user = await findOrCreateUserByEmail(profile.email, profile.displayName);
    await upsertProviderAccount(user.id, 'spotify', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

router.get('/google/login', (req, res) => {
  res.redirect(youtubeProvider.getAuthorizeUrl());
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing Google code' });

    const response = await youtubeProvider.exchangeCode(code);
    const profile = response.profile;

    const user = await findOrCreateUserByEmail(profile.email, profile.displayName);
    await upsertProviderAccount(user.id, 'youtube', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

export default router;

router.get('/spotify/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing Spotify code' });

    const response = await spotifyProvider.exchangeCode(code);
    const profile = response.profile;
    const email = profile.email;

    const user = await prisma.user.upsert({
      where: { email: email ?? '' },
      update: { displayName: profile.displayName ?? undefined },
      create: { email: email ?? undefined, displayName: profile.displayName ?? undefined },
    });

    await upsertProviderAccount(user.id, 'spotify', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

router.get('/google/login', (req, res) => {
  res.redirect(youtubeProvider.getAuthorizeUrl());
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing Google code' });

    const response = await youtubeProvider.exchangeCode(code);
    const profile = response.profile;

    if (!profile.email) {
      throw new Error('Google profile requires an email address');
    }

    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { displayName: profile.displayName ?? undefined },
      create: { email: profile.email, displayName: profile.displayName ?? undefined },
    });

    await upsertProviderAccount(user.id, 'youtube', profile.id, response.accessToken, response.refreshToken, response.expiresIn);

    const token = buildJwt(user.id);
    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

export default router;
