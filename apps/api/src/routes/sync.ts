import { Router } from 'express';
import { authGuard, AuthenticatedRequest } from '../middleware/auth';
import { getProviderAccount } from '../lib/providerAccount';
import { SpotifyProvider } from '../modules/spotify';
import { YouTubeProvider } from '../modules/youtube';
import { TrackMatchingEngine } from '../modules/trackMatching/trackMatchingEngine';
import prisma from '../lib/prisma';

const router = Router();
const spotifyProvider = new SpotifyProvider();
const youtubeProvider = new YouTubeProvider();

function parseSyncInput(body: unknown): { playlistId: string; playlistName: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { playlistId, playlistName } = body as Record<string, unknown>;
  if (typeof playlistId !== 'string' || typeof playlistName !== 'string') return null;

  const normalizedId = playlistId.trim();
  const normalizedName = playlistName.trim();
  if (!normalizedId || !normalizedName || normalizedId.length > 200 || normalizedName.length > 150) return null;
  return { playlistId: normalizedId, playlistName: normalizedName };
}

router.post('/spotify-to-youtube', authGuard, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = parseSyncInput(req.body);
    if (!input) return res.status(400).json({ error: 'A valid playlistId and playlistName are required' });
    const { playlistId, playlistName } = input;

    const spotifyAccount = await getProviderAccount(req.user!.id, 'spotify');
    const youtubeAccount = await getProviderAccount(req.user!.id, 'youtube');

    const sourceTracks = await spotifyProvider.getPlaylistTracks(spotifyAccount.accessToken, playlistId);
    const targetPlaylist = await youtubeProvider.createPlaylist(youtubeAccount.accessToken, playlistName, 'Imported from Spotify via SongBridge');
    const targetPlaylistId = targetPlaylist.id;
    if (!targetPlaylistId) {
      throw new Error('Failed to create YouTube playlist');
    }

    const matches = [];
    for (const sourceTrack of sourceTracks) {
      const candidates = await youtubeProvider.searchTracks(youtubeAccount.accessToken, sourceTrack);
      const bestMatch = TrackMatchingEngine.findBestMatch(sourceTrack, candidates);
      if (bestMatch) {
        matches.push({ source: sourceTrack, target: bestMatch.track, score: bestMatch.score });
      }
    }

    const matchedTracks = matches.map((match) => match.target);
    await youtubeProvider.addTracksToPlaylist(youtubeAccount.accessToken, targetPlaylistId, matchedTracks);
    if (matches.length > 0) {
      await prisma.matchHistory.createMany({
        data: matches.map(({ source, target, score }) => ({
          userId: req.user!.id,
          sourceProvider: 'spotify',
          targetProvider: 'youtube',
          sourcePlaylist: playlistId,
          targetPlaylist: targetPlaylistId,
          sourceTrackId: source.sourceId,
          targetTrackId: target.sourceId,
          title: source.title,
          artists: source.artists.join(', '),
          album: source.album,
          sourceUri: source.sourceUri,
          targetUri: target.sourceUri,
          score,
        })),
      });
    }

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
    const input = parseSyncInput(req.body);
    if (!input) return res.status(400).json({ error: 'A valid playlistId and playlistName are required' });
    const { playlistId, playlistName } = input;

    const spotifyAccount = await getProviderAccount(req.user!.id, 'spotify');
    const youtubeAccount = await getProviderAccount(req.user!.id, 'youtube');

    const sourceTracks = await youtubeProvider.getPlaylistTracks(youtubeAccount.accessToken, playlistId);
    const targetPlaylist = await spotifyProvider.createPlaylist(spotifyAccount.accessToken, playlistName, 'Imported from YouTube via SongBridge');

    const matches = [];
    for (const sourceTrack of sourceTracks) {
      const candidates = await spotifyProvider.searchTracks(spotifyAccount.accessToken, sourceTrack);
      const bestMatch = TrackMatchingEngine.findBestMatch(sourceTrack, candidates);
      if (bestMatch) {
        matches.push({ source: sourceTrack, target: bestMatch.track, score: bestMatch.score });
      }
    }

    const matchedTracks = matches.map((match) => match.target);
    await spotifyProvider.addTracksToPlaylist(spotifyAccount.accessToken, targetPlaylist.id, matchedTracks);
    if (matches.length > 0) {
      await prisma.matchHistory.createMany({
        data: matches.map(({ source, target, score }) => ({
          userId: req.user!.id,
          sourceProvider: 'youtube',
          targetProvider: 'spotify',
          sourcePlaylist: playlistId,
          targetPlaylist: targetPlaylist.id,
          sourceTrackId: source.sourceId,
          targetTrackId: target.sourceId,
          title: source.title,
          artists: source.artists.join(', '),
          album: source.album,
          sourceUri: source.sourceUri,
          targetUri: target.sourceUri,
          score,
        })),
      });
    }

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
