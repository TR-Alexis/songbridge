import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export async function fetchSpotifyPlaylists() {
  const response = await axios.get(`${apiUrl}/api/spotify/playlists`, requestConfig);
  return response.data.playlists;
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
