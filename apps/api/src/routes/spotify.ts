import { Router } from 'express';
import SpotifyWebApi from 'spotify-web-api-node';

const router = Router();

const createSpotifyClient = (accessToken: string) => {
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  return spotifyApi;
};

router.get('/playlists', async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const spotifyApi = createSpotifyClient(accessToken);
    const data = await spotifyApi.getUserPlaylists({ limit: 50 });

    const playlists = data.body.items.map((item) => ({
      id: item.id,
      name: item.name,
      trackCount: item.tracks.total,
      uri: item.uri,
    }));

    res.json({ playlists });
  } catch (error) {
    next(error);
  }
});

router.get('/liked-songs', async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const spotifyApi = createSpotifyClient(accessToken);
    const data = await spotifyApi.getMySavedTracks({ limit: 50 });

    const tracks = data.body.items.map((item) => ({
      id: item.track?.id,
      name: item.track?.name,
      album: item.track?.album.name,
      artists: item.track?.artists.map((artist) => artist.name).join(', '),
      spotifyUrl: item.track?.external_urls.spotify,
      spotifyUri: item.track?.uri,
    }));

    res.json({ tracks });
  } catch (error) {
    next(error);
  }
});

export default router;
