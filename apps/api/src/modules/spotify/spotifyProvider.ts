import SpotifyWebApi from 'spotify-web-api-node';
import { ProviderAdapter } from '../../core/providers/provider';
import { Track } from '../../core/types/track';

export interface SpotifyProfile {
  id: string;
  email?: string;
  displayName?: string;
}

export const spotifyScopes = [
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
];

export class SpotifyProvider implements ProviderAdapter<SpotifyProfile> {
  private buildClient(accessToken?: string): SpotifyWebApi {
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });

    if (accessToken) {
      spotifyApi.setAccessToken(accessToken);
    }

    return spotifyApi;
  }

  getAuthorizeUrl() {
    const spotifyApi = this.buildClient();
    return spotifyApi.createAuthorizeURL(spotifyScopes, 'tunebridge');
  }

  async exchangeCode(code: string) {
    const spotifyApi = this.buildClient();
    const data = await spotifyApi.authorizationCodeGrant(code);
    const profileData = await this.buildClient(data.body.access_token).getMe();

    return {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
      profile: {
        id: profileData.body.id,
        email: profileData.body.email ?? undefined,
        displayName: profileData.body.display_name ?? undefined,
      },
    };
  }

  async getPlaylists(accessToken: string) {
    const spotifyApi = this.buildClient(accessToken);
    const data = await spotifyApi.getUserPlaylists({ limit: 50 });

    return data.body.items.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      externalUrl: playlist.external_urls.spotify,
      trackCount: playlist.tracks.total,
      uri: playlist.uri,
    }));
  }

  async getPlaylistTracks(accessToken: string, playlistId: string) {
    const spotifyApi = this.buildClient(accessToken);
    const data = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100 });

    return data.body.items
      .map((item) => item.track)
      .filter((track): track is SpotifyApi.TrackObjectFull => Boolean(track))
      .map((track) => this.toTrack(track));
  }

  async createPlaylist(accessToken: string, name: string, description?: string) {
    const spotifyApi = this.buildClient(accessToken);
    const profile = await spotifyApi.getMe();
    const response = await spotifyApi.createPlaylist(profile.body.id, {
      name,
      description,
      public: false,
    });

    return {
      id: response.body.id,
      externalUrl: response.body.external_urls.spotify,
      uri: response.body.uri,
    };
  }

  async addTracksToPlaylist(accessToken: string, playlistId: string, tracks: Track[]) {
    const spotifyApi = this.buildClient(accessToken);
    const uris = tracks
      .map((track) => track.sourceUri)
      .filter((uri): uri is string => Boolean(uri));

    if (uris.length === 0) {
      return;
    }

    await spotifyApi.addTracksToPlaylist(playlistId, uris);
  }

  toTrack(source: SpotifyApi.TrackObjectFull): Track {
    return {
      title: source.name,
      artists: source.artists.map((artist) => artist.name),
      album: source.album?.name ?? undefined,
      duration: source.duration_ms,
      isrc: source.external_ids?.isrc ?? undefined,
      sourceId: source.id ?? undefined,
      sourceUri: source.uri ?? undefined,
    };
  }

  fromTrack(track: Track) {
    return track.sourceUri || '';
  }
}
