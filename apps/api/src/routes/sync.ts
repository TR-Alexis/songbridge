import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { getProviderAccount } from '../lib/providerAccount';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { TrackMatchingEngine } from '../modules/trackMatching/trackMatchingEngine';

const router = Router();
const spotifyProvider = new SpotifyProvider();
const youtubeProvider = new YouTubeProvider();

router.post('/spotify-to-youtube', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { playlistId, playlistName } = req.body;
    if (!playlistId || !playlistName) {
      return res.status(400).json({ error: 'playlistId and playlistName are required' });
    }

    const spotifyAccount = await getProviderAccount(req.user!.id, 'spotify');
    const youtubeAccount = await getProviderAccount(req.user!.id, 'youtube');

    const sourceTracks = await spotifyProvider.getPlaylistTracks(spotifyAccount.accessToken, playlistId);
    const targetPlaylist = await youtubeProvider.createPlaylist(youtubeAccount.accessToken, playlistName, 'Imported from Spotify via TuneBridge');

    const matchedTracks = [];
    for (const sourceTrack of sourceTracks) {
      const candidates = await youtubeProvider.searchTracks(youtubeAccount.accessToken, sourceTrack);
      const bestMatch = TrackMatchingEngine.findBestMatch(sourceTrack, candidates);
      if (bestMatch) {
        matchedTracks.push(bestMatch.track);
      }
    }

    await youtubeProvider.addTracksToPlaylist(youtubeAccount.accessToken, targetPlaylist.id, matchedTracks);

    res.json({
      totalTracks: sourceTracks.length,
      matchedTracks: matchedTracks.length,
      targetPlaylist,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/youtube-to-spotify', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { playlistId, playlistName } = req.body;
    if (!playlistId || !playlistName) {
      return res.status(400).json({ error: 'playlistId and playlistName are required' });
    }

    const spotifyAccount = await getProviderAccount(req.user!.id, 'spotify');
    const youtubeAccount = await getProviderAccount(req.user!.id, 'youtube');

    const sourceTracks = await youtubeProvider.getPlaylistTracks(youtubeAccount.accessToken, playlistId);
    const targetPlaylist = await spotifyProvider.createPlaylist(spotifyAccount.accessToken, playlistName, 'Imported from YouTube via TuneBridge');

    const matchedTracks = [];
    for (const sourceTrack of sourceTracks) {
      const candidates = await spotifyProvider.searchTracks(spotifyAccount.accessToken, sourceTrack);
      const bestMatch = TrackMatchingEngine.findBestMatch(sourceTrack, candidates);
      if (bestMatch) {
        matchedTracks.push(bestMatch.track);
      }
    }

    await spotifyProvider.addTracksToPlaylist(spotifyAccount.accessToken, targetPlaylist.id, matchedTracks);

    res.json({
      totalTracks: sourceTracks.length,
      matchedTracks: matchedTracks.length,
      targetPlaylist,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
