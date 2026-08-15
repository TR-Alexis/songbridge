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

  getAuthorizeUrl(state: string) {
    const spotifyApi = this.buildClient();
    return spotifyApi.createAuthorizeURL(spotifyScopes, state);
  }

  async refreshAccessToken(refreshToken: string) {
    const spotifyApi = this.buildClient();
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    return { accessToken: data.body.access_token, expiresIn: data.body.expires_in };
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
    const items: any[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const data = await spotifyApi.getUserPlaylists({ limit: 50, offset });
      items.push(...data.body.items);
      hasMore = Boolean(data.body.next);
      offset += data.body.items.length;
    }

    return items.map((playlist: any) => ({
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
    const items: any[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const data = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100, offset });
      items.push(...data.body.items);
      hasMore = Boolean(data.body.next);
      offset += data.body.items.length;
    }

    return items
      .map((item: any) => item.track)
      .filter((track): track is any => Boolean(track))
      .map((track: any) => this.toTrack(track));
  }

  async getLibraryTracks(accessToken: string) {
    const spotifyApi = this.buildClient(accessToken);
    const items: any[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const data = await spotifyApi.getMySavedTracks({ limit: 50, offset });
      items.push(...data.body.items);
      hasMore = Boolean(data.body.next);
      offset += data.body.items.length;
    }

    return items
      .map((item: any) => item.track)
      .filter((track): track is any => Boolean(track))
      .map((track: any) => this.toTrack(track));
  }

  async searchTracks(accessToken: string, track: Track) {
    const spotifyApi = this.buildClient(accessToken);
    const queryParts = [`track:${track.title}`];
    if (track.artists.length > 0) {
      queryParts.push(`artist:${track.artists[0]}`);
    }

    const query = queryParts.join(' ');
    const result = await spotifyApi.searchTracks(query, { limit: 10 });
    const items = result.body.tracks?.items ?? [];

    return items.map((item: any) => this.toTrack(item));
  }

  async createPlaylist(accessToken: string, name: string, description?: string) {
    const spotifyApi = this.buildClient(accessToken);
    const profile = await spotifyApi.getMe();
    const response = await spotifyApi.createPlaylist(profile.body.id, {
      name,
      description,
      public: false,
    } as any);

    const playlistResponse: any = response;
    return {
      id: playlistResponse.body?.id,
      externalUrl: playlistResponse.body?.external_urls?.spotify,
      uri: playlistResponse.body?.uri,
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

    for (let index = 0; index < uris.length; index += 100) {
      await spotifyApi.addTracksToPlaylist(playlistId, uris.slice(index, index + 100));
    }
  }

  toTrack(source: any): Track {
    return {
      title: source.name,
      artists: (source.artists || []).map((artist: any) => artist.name),
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
