'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchSpotifyLikedSongs,
  fetchSpotifyPlaylists,
  fetchYouTubePlaylists,
  loginGoogle,
  loginSpotify,
  syncSpotifyToYouTube,
  syncYouTubeToSpotify,
} from './dashboardApi';

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  uri?: string;
}

interface SyncResult {
  totalTracks: number;
  matchedTracks: number;
  targetPlaylist: {
    id: string;
    externalUrl: string;
  };
}

export default function DashboardClient() {
  const [token, setToken] = useState<string | null>(null);
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<string>('');
  const [selectedYouTubePlaylist, setSelectedYouTubePlaylist] = useState<string>('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('TuneBridge Sync');

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      window.history.replaceState({}, '', window.location.pathname);
      localStorage.setItem('tunebridge_token', urlToken);
      setToken(urlToken);
      return;
    }

    const savedToken = localStorage.getItem('tunebridge_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const spotifyPlaylistsQuery = useQuery({
    queryKey: ['spotifyPlaylists', token],
    queryFn: async () => {
      if (!token) return [];
      return fetchSpotifyPlaylists(token);
    },
    enabled: Boolean(token),
  });

  const spotifyLikedSongsQuery = useQuery({
    queryKey: ['spotifyLikedSongs', token],
    queryFn: async () => {
      if (!token) return [];
      return fetchSpotifyLikedSongs(token);
    },
    enabled: Boolean(token),
  });

  const youTubePlaylistsQuery = useQuery({
    queryKey: ['youtubePlaylists', token],
    queryFn: async () => {
      if (!token) return [];
      return fetchYouTubePlaylists(token);
    },
    enabled: Boolean(token),
  });

  const handleSyncSpotifyToYouTube = async () => {
    if (!token || !selectedSpotifyPlaylist) return;
    setSyncError(null);
    setSyncResult(null);

    try {
      const result = await syncSpotifyToYouTube(token, selectedSpotifyPlaylist, playlistName);
      setSyncResult(result);
    } catch (error: any) {
      setSyncError(error?.response?.data?.error || error.message);
    }
  };

  const handleSyncYouTubeToSpotify = async () => {
    if (!token || !selectedYouTubePlaylist) return;
    setSyncError(null);
    setSyncResult(null);

    try {
      const result = await syncYouTubeToSpotify(token, selectedYouTubePlaylist, playlistName);
      setSyncResult(result);
    } catch (error: any) {
      setSyncError(error?.response?.data?.error || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-8">
          <section className="space-y-4">
            <h1 className="text-4xl font-semibold">TuneBridge</h1>
            <p className="text-slate-400">
              Sincroniza playlists entre Spotify y YouTube usando un motor de coincidencia común.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => loginSpotify()}
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Conectar Spotify
            </button>
            <button
              onClick={() => loginGoogle()}
              className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Conectar YouTube
            </button>
          </section>

          {token ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <h2 className="text-xl font-semibold">Importar desde Spotify</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300">Playlist Spotify</label>
                    <select
                      value={selectedSpotifyPlaylist}
                      onChange={(event) => setSelectedSpotifyPlaylist(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    >
                      <option value="">Selecciona una playlist</option>
                      {spotifyPlaylistsQuery.data?.map((playlist: Playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.name} ({playlist.trackCount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300">Nombre de playlist destino</label>
                    <input
                      value={playlistName}
                      onChange={(event) => setPlaylistName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    />
                  </div>

                  <button
                    onClick={handleSyncSpotifyToYouTube}
                    className="w-full rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-400"
                  >
                    Sincronizar Spotify → YouTube
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <h2 className="text-xl font-semibold">Importar desde YouTube</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300">Playlist YouTube</label>
                    <select
                      value={selectedYouTubePlaylist}
                      onChange={(event) => setSelectedYouTubePlaylist(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    >
                      <option value="">Selecciona una playlist</option>
                      {youTubePlaylistsQuery.data?.map((playlist: Playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.name} ({playlist.trackCount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSyncYouTubeToSpotify}
                    className="w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Sincronizar YouTube → Spotify
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {syncError ? (
            <div className="rounded-3xl border border-red-500 bg-red-500/10 p-5 text-sm text-red-200">{syncError}</div>
          ) : null}

          {syncResult ? (
            <div className="rounded-3xl border border-emerald-500 bg-emerald-500/10 p-5 text-slate-100">
              <p className="text-base font-semibold">Sincronización completada</p>
              <p>Total de pistas: {syncResult.totalTracks}</p>
              <p>Coincidencias encontradas: {syncResult.matchedTracks}</p>
              <p>
                Playlist destino:{' '}
                <a className="text-emerald-300 underline" href={syncResult.targetPlaylist.externalUrl} target="_blank" rel="noreferrer">
                  Ver en destino
                </a>
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold">Estado de conexión</h2>
            <p className="mt-2 text-slate-400">Spotify: {spotifyPlaylistsQuery.isSuccess ? 'Conectado' : 'No conectado'}</p>
            <p className="text-slate-400">YouTube: {youTubePlaylistsQuery.isSuccess ? 'Conectado' : 'No conectado'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
