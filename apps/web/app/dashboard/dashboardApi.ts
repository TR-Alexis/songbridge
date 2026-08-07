import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function loginSpotify() {
  window.location.href = `${apiUrl}/api/auth/spotify/login`;
}

export async function loginGoogle() {
  window.location.href = `${apiUrl}/api/auth/google/login`;
}

export async function fetchSpotifyPlaylists(token: string) {
  const response = await axios.get(`${apiUrl}/api/spotify/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlists;
}

export async function fetchSpotifyLikedSongs(token: string) {
  const response = await axios.get(`${apiUrl}/api/spotify/liked-songs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.tracks;
}

export async function syncSpotifyToYouTube(token: string, playlistId: string, playlistName: string) {
  const response = await axios.post(
    `${apiUrl}/api/sync/spotify-to-youtube`,
    { playlistId, playlistName },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
}

export async function syncYouTubeToSpotify(token: string, playlistId: string, playlistName: string) {
  const response = await axios.post(
    `${apiUrl}/api/sync/youtube-to-spotify`,
    { playlistId, playlistName },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
}

export async function fetchYouTubePlaylists(token: string) {
  const response = await axios.get(`${apiUrl}/api/youtube/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlists;
}
