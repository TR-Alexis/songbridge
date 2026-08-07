import { Router } from 'express';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { upsertProviderAccount } from '../lib/providerAccount';
import { TrackMatchingEngine } from '../modules/trackMatching/trackMatchingEngine';

const router = Router();
const spotifyProvider = new SpotifyProvider();
const youtubeProvider = new YouTubeProvider();

router.get('/spotify/login', (req, res) => {
  res.redirect(spotifyProvider.getAuthorizeUrl());
});

router.get('/spotify/callback', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const response = await spotifyProvider.exchangeCode(code);
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');

    await upsertProviderAccount(userId, 'spotify', response.profile.id, response.accessToken, response.refreshToken, response.expiresIn);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/youtube/login', (req, res) => {
  res.redirect(youtubeProvider.getAuthorizeUrl());
});

router.get('/youtube/callback', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const response = await youtubeProvider.exchangeCode(code);
    const userId = req.user?.id;
    if (!userId) throw new Error('User not authenticated');

    await upsertProviderAccount(userId, 'youtube', response.profile.id, response.accessToken, response.refreshToken, response.expiresIn);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
