import { google } from 'googleapis';
import { ProviderAdapter } from '../../core/providers/provider';
import { Track } from '../../core/types/track';

export interface YouTubeProfile {
  id: string;
  email?: string;
  displayName?: string;
}

const youtubeScopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

export function normalizeYouTubeArtist(channelTitle?: string): string[] {
  if (!channelTitle) return [];

  const artist = channelTitle
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*-?\s*VEVO$/i, '')
    .trim();

  return artist ? [artist] : [];
}

export class YouTubeProvider implements ProviderAdapter<YouTubeProfile> {
  private buildOauthClient(accessToken?: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    if (accessToken || refreshToken) oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return oauth2Client;
  }

  getAuthorizeUrl(state: string) {
    const oauth2Client = this.buildOauthClient();
    return oauth2Client.generateAuthUrl({ access_type: 'offline', scope: youtubeScopes, prompt: 'consent select_account', state });
  }

  async refreshAccessToken(refreshToken: string) {
    const oauth2Client = this.buildOauthClient(undefined, refreshToken);
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('Google did not return a refreshed access token');
    const expiryDate = oauth2Client.credentials.expiry_date;
    return { accessToken: token, expiresIn: expiryDate ? Math.max(60, Math.floor((expiryDate - Date.now()) / 1000)) : 3600 };
  }

  async exchangeCode(code: string) {
    const oauth2Client = this.buildOauthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const profile = await this.getProfile(tokens.access_token ?? '');

    return {
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token ?? undefined,
      expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      profile: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      },
    };
  }

  async getProfile(accessToken: string): Promise<YouTubeProfile> {
    const oauth2Client = this.buildOauthClient(accessToken);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const profile = await oauth2.userinfo.get();
    return {
      id: profile.data.id ?? '',
      email: profile.data.email ?? undefined,
      displayName: profile.data.name ?? undefined,
    };
  }

  async getPlaylists(accessToken: string) {
    const oauth2Client = this.buildOauthClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const items: any[] = [];
    let pageToken: string | undefined;
    do {
      const response = await youtube.playlists.list({ part: ['snippet', 'contentDetails'], mine: true, maxResults: 50, pageToken });
      items.push(...(response.data.items ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.snippet?.title,
      description: playlist.snippet?.description,
      externalUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
      trackCount: playlist.contentDetails?.itemCount,
    }));
  }

  async getPlaylistTracks(accessToken: string, playlistId: string, maxItems?: number) {
    const oauth2Client = this.buildOauthClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const items: any[] = [];
    let pageToken: string | undefined;
    do {
      const remaining = maxItems ? maxItems - items.length : 50;
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: Math.min(50, remaining),
        pageToken,
      });
      items.push(...(response.data.items ?? []));
      pageToken = !maxItems || items.length < maxItems ? response.data.nextPageToken ?? undefined : undefined;
    } while (pageToken);

    const selectedItems = maxItems ? items.slice(0, maxItems) : items;
    return selectedItems
      .map((item: any) => item.snippet)
      .filter((snippet): snippet is any => Boolean(snippet) && snippet.resourceId?.kind === 'youtube#video')
      .map((snippet: any) => this.toTrack(snippet));
  }

  async searchTracks(accessToken: string, track: Track) {
    const oauth2Client = this.buildOauthClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const query = `${track.title} ${track.artists.join(' ')}`.trim();
    const response: any = await youtube.search.list({ part: ['snippet'], q: query, type: ['video'], maxResults: 10 });

    return response.data.items?.map((item: any) => ({
      title: item.snippet.title,
      artists: [item.snippet.channelTitle],
      album: undefined,
      duration: undefined,
      sourceId: item.id.videoId,
      sourceUri: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    })) ?? [];
  }

  async createPlaylist(accessToken: string, name: string, description?: string) {
    const oauth2Client = this.buildOauthClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: name, description: description ?? '', tags: ['SongBridge'], defaultLanguage: 'en' },
        status: { privacyStatus: 'private' },
      },
    });

    return {
      id: response.data.id,
      externalUrl: `https://www.youtube.com/playlist?list=${response.data.id}`,
    };
  }

  async addTracksToPlaylist(accessToken: string, playlistId: string, tracks: Track[]) {
    const oauth2Client = this.buildOauthClient(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    for (const track of tracks) {
      if (!track.sourceId) continue;
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId: track.sourceId },
          },
        },
      });
    }
  }

  toTrack(source: any): Track {
    return {
      title: source.title,
      artists: normalizeYouTubeArtist(source.videoOwnerChannelTitle),
      album: undefined,
      duration: undefined,
      sourceId: source.resourceId.videoId,
      sourceUri: `https://www.youtube.com/watch?v=${source.resourceId.videoId}`,
    };
  }

  fromTrack(track: Track) {
    return track.sourceUri || '';
  }
}
