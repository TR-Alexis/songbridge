'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  uri: string;
}

export default function DashboardClient() {
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      window.history.replaceState({}, '', window.location.pathname);
      localStorage.setItem('songbridge_token', urlToken);
      setToken(urlToken);
      return;
    }

    const savedToken = localStorage.getItem('songbridge_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    axios
      .get(`${apiUrl}/api/spotify/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setPlaylists(response.data.playlists || []);
      })
      .catch((err) => {
        setError(err?.response?.data?.error || err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, apiUrl]);

  const login = () => {
    window.location.href = `${apiUrl}/api/auth/login`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold">SongBridge Dashboard</h1>
            <p className="mt-3 text-slate-400">
              Inicia sesión con Spotify para ver tus playlists y comenzar a buscar coincidencias en YouTube.
            </p>
          </div>

          {!token ? (
            <button onClick={login} className="w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:w-auto">
              Iniciar sesión con Spotify
            </button>
          ) : null}

          {error ? <p className="rounded-2xl border border-red-500 bg-red-500/10 p-4 text-sm text-red-200">{error}</p> : null}

          {loading ? <p>Cargando playlists...</p> : null}

          {playlists.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <table className="min-w-full border-collapse text-left text-slate-200">
                <thead>
                  <tr>
                    <th className="border-b border-slate-700 p-3 text-sm font-semibold">Playlist</th>
                    <th className="border-b border-slate-700 p-3 text-sm font-semibold">Canciones</th>
                    <th className="border-b border-slate-700 p-3 text-sm font-semibold">URI</th>
                  </tr>
                </thead>
                <tbody>
                  {playlists.map((playlist) => (
                    <tr key={playlist.id} className="border-b border-slate-800">
                      <td className="p-3 text-sm text-slate-100">{playlist.name}</td>
                      <td className="p-3 text-sm text-slate-400">{playlist.trackCount}</td>
                      <td className="p-3 text-sm text-slate-400 break-all">{playlist.uri}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : token && !loading ? (
            <p className="text-slate-400">No se encontraron playlists.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
