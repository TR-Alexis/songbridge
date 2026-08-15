'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  disconnectProvider,
  fetchProviderConnections,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyPlaylists,
  fetchSession,
  fetchYouTubePlaylistTracks,
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

interface Track {
  title: string;
  artists: string[];
  album?: string;
  duration?: number;
  sourceId?: string;
}

type ProviderName = 'spotify' | 'youtube';
type SyncDirection = 'spotify-to-youtube' | 'youtube-to-spotify';

interface ProviderConnection {
  provider: ProviderName;
  providerUserId: string;
  email?: string;
  displayName?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderCardProps {
  label: string;
  provider: ProviderName;
  connection?: ProviderConnection;
  checking: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: (provider: ProviderName) => void;
}

function ProviderCard({ label, provider, connection, checking, loading, onConnect, onDisconnect }: ProviderCardProps) {
  const accent = provider === 'spotify' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-sky-500 hover:bg-sky-400';

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{label}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connection ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
          {checking ? 'Consultando…' : connection ? 'Conectado' : 'No conectado'}
        </span>
      </div>

      {checking ? (
        <p className="mt-5 text-sm text-slate-400">Consultando la cuenta vinculada…</p>
      ) : connection ? (
        <div className="mt-5 space-y-2 text-sm">
          <p className="text-base font-medium text-slate-100">{connection.displayName || connection.email || 'Cuenta vinculada'}</p>
          {connection.email ? <p className="text-slate-400">{connection.email}</p> : null}
          <p className="break-all text-xs text-slate-500">ID: {connection.providerUserId}</p>
          {connection.expiresAt ? (
            <p className="text-xs text-slate-500">Token válido hasta: {new Date(connection.expiresAt).toLocaleString('es-MX')}</p>
          ) : null}
          <button
            onClick={() => onDisconnect(provider)}
            disabled={loading}
            className="mt-4 w-full rounded-full border border-red-500/60 px-5 py-2.5 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Desconectando…' : `Desconectar ${label}`}
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <p className="mb-4 text-sm text-slate-400">Vincula una cuenta para consultar y sincronizar sus playlists.</p>
          <button onClick={onConnect} className={`w-full rounded-full px-6 py-3 text-sm font-semibold text-slate-950 transition ${accent}`}>
            Conectar {label}
          </button>
        </div>
      )}
    </article>
  );
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error || error.message;
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

function PlaylistPreview({ tracks, loading, error }: { tracks?: Track[]; loading: boolean; error?: unknown }) {
  if (loading) return <p className="mt-3 text-sm text-slate-400">Cargando canciones…</p>;
  if (error) return <p className="mt-3 text-xs text-red-300">No se pudo cargar la vista previa: {getErrorMessage(error)}</p>;
  if (!tracks) return null;
  if (tracks.length === 0) return <p className="mt-3 text-sm text-slate-400">Esta playlist no contiene canciones disponibles.</p>;

  return (
    <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa · hasta 20 canciones</p>
      <ol className="divide-y divide-slate-800">
        {tracks.map((track, index) => (
          <li key={`${track.sourceId || track.title}-${index}`} className="flex gap-3 px-2 py-2.5 text-sm">
            <span className="w-5 shrink-0 text-right text-slate-600">{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-200">{track.title}</p>
              <p className="truncate text-xs text-slate-500">{track.artists.length > 0 ? track.artists.join(', ') : 'Artista no disponible'}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function DashboardClient() {
  const queryClient = useQueryClient();
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<string>('');
  const [selectedYouTubePlaylist, setSelectedYouTubePlaylist] = useState<string>('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncingDirection, setSyncingDirection] = useState<SyncDirection | null>(null);
  const [playlistName, setPlaylistName] = useState('SongBridge Sync');

  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: fetchSession, retry: false });
  const connectionsQuery = useQuery<ProviderConnection[]>({
    queryKey: ['providerConnections'],
    queryFn: fetchProviderConnections,
    enabled: sessionQuery.isSuccess,
    retry: false,
  });

  const spotifyConnection = connectionsQuery.data?.find((connection) => connection.provider === 'spotify');
  const youTubeConnection = connectionsQuery.data?.find((connection) => connection.provider === 'youtube');

  const disconnectMutation = useMutation({
    mutationFn: disconnectProvider,
    onSuccess: async (_data, provider) => {
      if (provider === 'spotify') setSelectedSpotifyPlaylist('');
      if (provider === 'youtube') setSelectedYouTubePlaylist('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['providerConnections'] }),
        queryClient.invalidateQueries({ queryKey: [`${provider}Playlists`] }),
      ]);
    },
    onError: (error: unknown) => setSyncError(getErrorMessage(error)),
  });

  const handleDisconnect = (provider: ProviderName) => {
    const label = provider === 'spotify' ? 'Spotify' : 'YouTube';
    if (window.confirm(`¿Desconectar la cuenta de ${label}? Después podrás conectar una cuenta diferente.`)) {
      disconnectMutation.mutate(provider);
    }
  };

  const spotifyPlaylistsQuery = useQuery({
    queryKey: ['spotifyPlaylists'],
    queryFn: fetchSpotifyPlaylists,
    enabled: Boolean(spotifyConnection),
    retry: false,
  });

  const youTubePlaylistsQuery = useQuery({
    queryKey: ['youtubePlaylists'],
    queryFn: fetchYouTubePlaylists,
    enabled: Boolean(youTubeConnection),
    retry: false,
  });

  const spotifyPreviewQuery = useQuery<Track[]>({
    queryKey: ['spotifyPlaylistTracks', selectedSpotifyPlaylist],
    queryFn: () => fetchSpotifyPlaylistTracks(selectedSpotifyPlaylist),
    enabled: Boolean(spotifyConnection && selectedSpotifyPlaylist),
    retry: false,
  });

  const youTubePreviewQuery = useQuery<Track[]>({
    queryKey: ['youtubePlaylistTracks', selectedYouTubePlaylist],
    queryFn: () => fetchYouTubePlaylistTracks(selectedYouTubePlaylist),
    enabled: Boolean(youTubeConnection && selectedYouTubePlaylist),
    retry: false,
  });

  const runSync = async (direction: SyncDirection, operation: () => Promise<SyncResult>) => {
    if (syncingDirection) return;
    const startedAt = Date.now();
    setSyncError(null);
    setSyncResult(null);
    setSyncingDirection(direction);

    try {
      const result = await operation();
      const remaining = Math.max(0, 3000 - (Date.now() - startedAt));
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setSyncResult(result);
    } catch (error: unknown) {
      const remaining = Math.max(0, 3000 - (Date.now() - startedAt));
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setSyncError(getErrorMessage(error));
    } finally {
      setSyncingDirection(null);
    }
  };

  const handleSyncSpotifyToYouTube = async () => {
    if (!selectedSpotifyPlaylist) return;
    await runSync('spotify-to-youtube', () => syncSpotifyToYouTube(selectedSpotifyPlaylist, playlistName));
  };

  const handleSyncYouTubeToSpotify = async () => {
    if (!selectedYouTubePlaylist) return;
    await runSync('youtube-to-spotify', () => syncYouTubeToSpotify(selectedYouTubePlaylist, playlistName));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-8">
          <section className="space-y-4">
            <h1 className="text-4xl font-semibold">SongBridge</h1>
            <p className="text-slate-400">
              Sincroniza playlists entre Spotify y YouTube usando un motor de coincidencia común.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ProviderCard
              label="Spotify"
              provider="spotify"
              connection={spotifyConnection}
              checking={sessionQuery.isLoading || connectionsQuery.isLoading}
              loading={disconnectMutation.isPending && disconnectMutation.variables === 'spotify'}
              onConnect={loginSpotify}
              onDisconnect={handleDisconnect}
            />
            <ProviderCard
              label="YouTube"
              provider="youtube"
              connection={youTubeConnection}
              checking={sessionQuery.isLoading || connectionsQuery.isLoading}
              loading={disconnectMutation.isPending && disconnectMutation.variables === 'youtube'}
              onConnect={loginGoogle}
              onDisconnect={handleDisconnect}
            />
          </section>

          {connectionsQuery.isError ? (
            <div className="rounded-3xl border border-red-500 bg-red-500/10 p-5 text-sm text-red-200">
              No se pudo consultar el estado de las cuentas: {getErrorMessage(connectionsQuery.error)}
            </div>
          ) : null}

          {sessionQuery.isSuccess ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <h2 className="text-xl font-semibold">Importar desde Spotify</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300">Playlist Spotify</label>
                    <select
                      value={selectedSpotifyPlaylist}
                      onChange={(event) => setSelectedSpotifyPlaylist(event.target.value)}
                      disabled={!spotifyConnection || spotifyPlaylistsQuery.isLoading}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    >
                      <option value="">Selecciona una playlist</option>
                      {spotifyPlaylistsQuery.data?.map((playlist: Playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.name} ({playlist.trackCount})
                        </option>
                      ))}
                    </select>
                    {spotifyPlaylistsQuery.isError ? (
                      <p className="mt-2 text-xs text-red-300">La cuenta está vinculada, pero no se pudieron cargar sus playlists: {getErrorMessage(spotifyPlaylistsQuery.error)}</p>
                    ) : null}
                    {selectedSpotifyPlaylist ? (
                      <PlaylistPreview
                        tracks={spotifyPreviewQuery.data}
                        loading={spotifyPreviewQuery.isLoading}
                        error={spotifyPreviewQuery.error}
                      />
                    ) : null}
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
                    disabled={!spotifyConnection || !youTubeConnection || !selectedSpotifyPlaylist || Boolean(syncingDirection)}
                    className="w-full rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncingDirection === 'spotify-to-youtube' ? 'Sincronizando…' : 'Sincronizar Spotify → YouTube'}
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
                      disabled={!youTubeConnection || youTubePlaylistsQuery.isLoading}
                      className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
                    >
                      <option value="">Selecciona una playlist</option>
                      {youTubePlaylistsQuery.data?.map((playlist: Playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.name} ({playlist.trackCount})
                        </option>
                      ))}
                    </select>
                    {youTubePlaylistsQuery.isError ? (
                      <p className="mt-2 text-xs text-red-300">La cuenta está vinculada, pero no se pudieron cargar sus playlists: {getErrorMessage(youTubePlaylistsQuery.error)}</p>
                    ) : null}
                    {selectedYouTubePlaylist ? (
                      <PlaylistPreview
                        tracks={youTubePreviewQuery.data}
                        loading={youTubePreviewQuery.isLoading}
                        error={youTubePreviewQuery.error}
                      />
                    ) : null}
                  </div>

                  <button
                    onClick={handleSyncYouTubeToSpotify}
                    disabled={!spotifyConnection || !youTubeConnection || !selectedYouTubePlaylist || Boolean(syncingDirection)}
                    className="w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncingDirection === 'youtube-to-spotify' ? 'Sincronizando…' : 'Sincronizar YouTube → Spotify'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {syncingDirection ? (
            <div role="status" aria-live="polite" className="flex items-center gap-4 rounded-3xl border border-sky-500 bg-sky-500/10 p-5 text-sky-100">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" aria-hidden="true" />
              <div>
                <p className="font-semibold">Sincronizando</p>
                <p className="text-sm text-sky-200/80">
                  {syncingDirection === 'spotify-to-youtube' ? 'Copiando Spotify → YouTube…' : 'Copiando YouTube → Spotify…'}
                </p>
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

        </div>
      </div>
    </div>
  );
}
