import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { SpotifyProvider } from '../modules/spotify';
import { getProviderAccount } from '../lib/providerAccount';

const router = Router();
const spotifyProvider = new SpotifyProvider();

router.get('/playlists', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const account = await getProviderAccount(req.user!.id, 'spotify');
    const playlists = await spotifyProvider.getPlaylists(account.accessToken);
    res.json({ playlists });
  } catch (error) {
    next(error);
  }
});

router.get('/playlists/:playlistId/tracks', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const playlistId = String(req.params.playlistId || '').trim();
    if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });

    const account = await getProviderAccount(req.user!.id, 'spotify');
    const tracks = await spotifyProvider.getPlaylistTracks(account.accessToken, playlistId, 20);
    return res.json({ tracks });
  } catch (error) {
    next(error);
  }
});

router.get('/liked-songs', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const account = await getProviderAccount(req.user!.id, 'spotify');
    const tracks = await spotifyProvider.getLibraryTracks(account.accessToken);
    res.json({ tracks });
  } catch (error) {
    next(error);
  }
});

export default router;
