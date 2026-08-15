import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
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

export function getPlaylistTrackCount(playlist: any): number {
  return playlist.items?.total ?? playlist.tracks?.total ?? 0;
}

export function getPlaylistItemTrack(item: any): any | null {
  return item.item ?? item.track ?? null;
}

export function buildSpotifySearchQueries(track: Track): string[] {
  const artist = track.artists[0]?.trim();
  const strictQuery = [`track:${track.title}`, artist ? `artist:${artist}` : ''].filter(Boolean).join(' ');
  const looseQuery = [track.title, artist].filter(Boolean).join(' ');

  return [...new Set([strictQuery, looseQuery].filter(Boolean))];
}

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

  private requestHeaders(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  getAuthorizeUrl(state: string) {
    const spotifyApi = this.buildClient();
    return spotifyApi.createAuthorizeURL(spotifyScopes, state, true);
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
    const profile = await this.getProfile(data.body.access_token);

    return {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
      profile,
    };
  }

  async getProfile(accessToken: string): Promise<SpotifyProfile> {
    const profileData = await this.buildClient(accessToken).getMe();
    return {
      id: profileData.body.id,
      email: profileData.body.email ?? undefined,
      displayName: profileData.body.display_name ?? undefined,
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
      trackCount: getPlaylistTrackCount(playlist),
      uri: playlist.uri,
    }));
  }

  async getPlaylistTracks(accessToken: string, playlistId: string, maxItems?: number) {
    const items: any[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const remaining = maxItems ? maxItems - items.length : 50;
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items`, {
        headers: this.requestHeaders(accessToken),
        params: { limit: Math.min(50, remaining), offset },
      });
      const pageItems = response.data.items ?? [];
      items.push(...pageItems);
      hasMore = Boolean(response.data.next) && (!maxItems || items.length < maxItems);
      offset += pageItems.length;
    }

    const selectedItems = maxItems ? items.slice(0, maxItems) : items;
    return selectedItems
      .map(getPlaylistItemTrack)
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
    for (const query of buildSpotifySearchQueries(track)) {
      const result = await spotifyApi.searchTracks(query, { limit: 10 });
      const items = result.body.tracks?.items ?? [];
      if (items.length > 0) {
        return items.map((item: any) => this.toTrack(item));
      }
    }

    return [];
  }

  async createPlaylist(accessToken: string, name: string, description?: string) {
    const response = await axios.post(
      'https://api.spotify.com/v1/me/playlists',
      { name, description, public: false },
      { headers: this.requestHeaders(accessToken) },
    );

    return {
      id: response.data.id,
      externalUrl: response.data.external_urls?.spotify,
      uri: response.data.uri,
    };
  }

  async addTracksToPlaylist(accessToken: string, playlistId: string, tracks: Track[]) {
    const uris = tracks
      .map((track) => track.sourceUri)
      .filter((uri): uri is string => Boolean(uri));

    if (uris.length === 0) {
      return;
    }

    for (let index = 0; index < uris.length; index += 100) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items`,
        { uris: uris.slice(index, index + 100) },
        { headers: this.requestHeaders(accessToken) },
      );
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
