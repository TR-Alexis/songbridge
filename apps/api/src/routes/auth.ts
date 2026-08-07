import { Router } from 'express';
import jwt from 'jsonwebtoken';
import SpotifyWebApi from 'spotify-web-api-node';
import prisma from '../lib/prisma';

const router = Router();
const scopes = ['user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'user-library-read'];

router.get('/login', (req, res) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  });

  const authorizeUrl = spotifyApi.createAuthorizeURL(scopes, 'state');
  res.redirect(authorizeUrl);
});

router.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ error: 'Missing Spotify code' });
    }

    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });

    const data = await spotifyApi.authorizationCodeGrant(code);
    const profileData = await spotifyApi.getMe();
    const spotifyUser = profileData.body;

    const expiresAt = new Date(Date.now() + data.body.expires_in * 1000);
    const user = await prisma.user.upsert({
      where: { spotifyId: spotifyUser.id },
      update: {
        email: spotifyUser.email ?? undefined,
        displayName: spotifyUser.display_name ?? undefined,
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        tokenExpiresAt: expiresAt,
      },
      create: {
        spotifyId: spotifyUser.id,
        email: spotifyUser.email ?? undefined,
        displayName: spotifyUser.display_name ?? undefined,
        accessToken: data.body.access_token,
        refreshToken: data.body.refresh_token,
        tokenExpiresAt: expiresAt,
      },
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign({ userId: user.id }, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    const frontendUrl = process.env.WEB_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

export default router;
