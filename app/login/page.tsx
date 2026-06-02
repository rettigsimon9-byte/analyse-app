'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, TrendingUp } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) { router.replace(searchParams.get('from') ?? '/'); }
    else { setError('Falsches Passwort'); setPassword(''); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f0e2e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} className="text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">Analysen</span>
        </div>
        <form onSubmit={submit} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 space-y-4">
          <h1 className="text-white text-lg font-semibold mb-2">Anmelden</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Passwort" autoFocus
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading || !password}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Einloggen…</> : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
