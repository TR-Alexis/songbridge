import { Track } from '../types/track';

export interface ProviderTrackAdapter<TSource, TTarget> {
  toTrack(source: TSource): Track;
  fromTrack(track: Track): TTarget;
}

export interface ProviderAdapter<TProfile = any> {
  getAuthorizeUrl(): string;
  exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; profile: TProfile }>;
  getPlaylists(accessToken: string): Promise<any[]>;
  getPlaylistTracks(accessToken: string, playlistId: string): Promise<Track[]>;
  getLibraryTracks?(accessToken: string): Promise<Track[]>;
  searchTracks(accessToken: string, track: Track): Promise<Track[]>;
  createPlaylist(accessToken: string, name: string, description?: string): Promise<any>;
  addTracksToPlaylist(accessToken: string, playlistId: string, tracks: Track[]): Promise<void>;
}
