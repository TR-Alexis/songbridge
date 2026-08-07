import SpotifyWebApi from 'spotify-web-api-node';
import prisma from './prisma';

export function buildSpotifyClient() {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  });
}

export async function getSpotifyClientForUser(user: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }): Promise<SpotifyWebApi> {
  const spotifyApi = buildSpotifyClient();
  spotifyApi.setAccessToken(user.accessToken);
  spotifyApi.setRefreshToken(user.refreshToken);

  const expired = new Date() >= new Date(user.tokenExpiresAt);
  if (expired) {
    const refreshData = await spotifyApi.refreshAccessToken();
    const { access_token: newAccessToken, expires_in: expiresIn } = refreshData.body;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.user.update({
      where: { spotifyId: user.spotifyId },
      data: {
        accessToken: newAccessToken,
        tokenExpiresAt: expiresAt,
      },
    });

    spotifyApi.setAccessToken(newAccessToken);
  }

  return spotifyApi;
}
