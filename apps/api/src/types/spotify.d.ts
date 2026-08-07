export interface SpotifyPlaylist {
  id: string;
  name: string;
  trackCount: number;
  uri: string;
}

export interface SpotifyTrack {
  id: string | undefined;
  name: string | undefined;
  album: string | undefined;
  artists: string;
  spotifyUrl: string | undefined;
  spotifyUri: string | undefined;
}
