import axios from 'axios';

// Browser requests stay on the web origin. Next.js proxies /api to Express,
// avoiding public-to-loopback requests when the app is exposed through ngrok.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

const requestConfig = { withCredentials: true };

async function startOAuth(path: string) {
  const response = await axios.post(
    `${apiUrl}${path}`,
    {},
    requestConfig,
  );
  window.location.href = response.data.authorizeUrl;
}

export async function loginSpotify() {
  return startOAuth('/api/auth/spotify/start');
}

export async function loginGoogle() {
  return startOAuth('/api/auth/google/start');
}

export async function fetchSession() {
  const response = await axios.get(`${apiUrl}/api/auth/session`, requestConfig);
  return response.data.user;
}

export async function fetchProviderConnections() {
  const response = await axios.get(`${apiUrl}/api/auth/providers`, requestConfig);
  return response.data.providers;
}

export async function disconnectProvider(provider: 'spotify' | 'youtube') {
  await axios.delete(`${apiUrl}/api/auth/providers/${provider}`, requestConfig);
}

export async function fetchSpotifyPlaylists() {
  const response = await axios.get(`${apiUrl}/api/spotify/playlists`, requestConfig);
  return response.data.playlists;
}

export async function fetchSpotifyPlaylistTracks(playlistId: string) {
  const response = await axios.get(
    `${apiUrl}/api/spotify/playlists/${encodeURIComponent(playlistId)}/tracks`,
    requestConfig,
  );
  return response.data.tracks;
}

export async function syncSpotifyToYouTube(playlistId: string, playlistName: string) {
  const response = await axios.post(
    `${apiUrl}/api/sync/spotify-to-youtube`,
    { playlistId, playlistName },
    requestConfig,
  );
  return response.data;
}

export async function syncYouTubeToSpotify(playlistId: string, playlistName: string) {
  const response = await axios.post(
    `${apiUrl}/api/sync/youtube-to-spotify`,
    { playlistId, playlistName },
    requestConfig,
  );
  return response.data;
}

export async function fetchYouTubePlaylists() {
  const response = await axios.get(`${apiUrl}/api/youtube/playlists`, requestConfig);
  return response.data.playlists;
}

export async function fetchYouTubePlaylistTracks(playlistId: string) {
  const response = await axios.get(
    `${apiUrl}/api/youtube/playlists/${encodeURIComponent(playlistId)}/tracks`,
    requestConfig,
  );
  return response.data.tracks;
}
