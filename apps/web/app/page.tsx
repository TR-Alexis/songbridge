import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30">
        <h1 className="text-4xl font-semibold">SongBridge</h1>
        <p className="mt-4 text-slate-300 leading-8">
          Plataforma escalable para migrar playlists y sincronizar música entre servicios.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/dashboard" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Ir al dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
