import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { YouTubeProvider } from '../modules/youtube';
import { getProviderAccount } from '../lib/providerAccount';

const router = Router();
const youtubeProvider = new YouTubeProvider();

router.get('/playlists', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const account = await getProviderAccount(req.user!.id, 'youtube');
    const playlists = await youtubeProvider.getPlaylists(account.accessToken);
    res.json({ playlists });
  } catch (error) {
    next(error);
  }
});

router.get('/search', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = String(req.query.q || '');
    if (!query) return res.status(400).json({ error: 'Query parameter q is required' });

    const account = await getProviderAccount(req.user!.id, 'youtube');
    const track = { title: query, artists: [] } as any;
    const results = await youtubeProvider.searchTracks(account.accessToken, track);
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
