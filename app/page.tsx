'use client';
import { useEffect, useState } from 'react';
import { Target, BarChart2, Briefcase, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ASSETS, fmtKurs } from '@/app/lib/assets';
import Link from 'next/link';

interface Preise { [ticker: string]: { kurs: number; change: number; changePct: number } | null }

export default function Dashboard() {
  const [stats, setStats] = useState({ zielzonen: 0, analysen: 0, positionen: 0 });
  const [preise, setPreise] = useState<Preise>({});
  const [recentAnalysen, setRecentAnalysen] = useState<{ id: string; name: string; bias: string; fazit: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingPreise, setLoadingPreise] = useState(true);
  const tickers = ASSETS.map(a => a.ticker).join(',');

  useEffect(() => {
    Promise.all([
      fetch('/api/zielzonen?aktiv=true').then(r => r.json()),
      fetch('/api/analysen').then(r => r.json()),
      fetch('/api/portfolio').then(r => r.json()),
    ]).then(async ([zz, an, pos]) => {
      // Nur Zielzonen zählen wo Kurs aktuell im Einstiegsbereich liegt
      const zzTickers = Array.from(new Set((zz as {ticker:string}[]).map(z => z.ticker).filter(Boolean))).join(',');
      let imBereich = 0;
      if (zzTickers) {
        const p = await fetch(`/api/preise?tickers=${zzTickers}`).then(r => r.json());
        imBereich = (zz as {ticker:string;einstiegMin:number;einstiegMax:number}[]).filter(z => {
          const kurs = p[z.ticker]?.kurs;
          return kurs != null && kurs >= z.einstiegMin && kurs <= z.einstiegMax;
        }).length;
      }
      setStats({ zielzonen: imBereich, analysen: an.length, positionen: pos.filter((p: { status: string }) => p.status === 'offen').length });
      setRecentAnalysen(an.slice(0, 5));
    });
    fetch(`/api/preise?tickers=${tickers}`)
      .then(r => r.json()).then(d => { setPreise(d); setLoadingPreise(false); })
      .catch(() => setLoadingPreise(false));
  }, [tickers]);

  const generateAll = async () => {
    setGenerating(true);
    await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: 'analyse' }) });
    const an = await fetch('/api/analysen').then(r => r.json());
    setStats(s => ({ ...s, analysen: an.length }));
    setRecentAnalysen(an.slice(0, 5));
    setGenerating(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Aktueller Marktüberblick</p>
        </div>
        <button onClick={generateAll} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? 'KI analysiert…' : 'Analysen generieren'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Aktive Zielzonen', value: stats.zielzonen, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Analysen gesamt', value: stats.analysen, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Offene Positionen', value: stats.positionen, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Live-Kurse</h2>
            <span className="text-xs text-gray-400">~5 min Verzögerung</span>
          </div>
          <div className="divide-y divide-gray-50">
            {loadingPreise
              ? <div className="p-5 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              : ASSETS.slice(0, 8).map(asset => {
                  const p = preise[asset.ticker];
                  const up = p && p.change > 0;
                  const dn = p && p.change < 0;
                  return (
                    <div key={asset.symbol} className="flex items-center justify-between px-5 py-3">
                      <div><p className="text-sm font-semibold text-gray-800">{asset.name}</p><p className="text-xs text-gray-400">{asset.markt}</p></div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmtKurs(p?.kurs, asset.symbol)}</p>
                        <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${up ? 'text-green-600' : dn ? 'text-red-500' : 'text-gray-400'}`}>
                          {up ? <TrendingUp size={11} /> : dn ? <TrendingDown size={11} /> : <Minus size={11} />}
                          {p ? `${p.changePct >= 0 ? '+' : ''}${p.changePct?.toFixed(2)}%` : '–'}
                        </p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Neueste Analysen</h2>
            <Link href="/analysen" className="text-xs text-indigo-600 font-medium">Alle →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAnalysen.length === 0
              ? <p className="px-5 py-8 text-center text-gray-400 text-sm">Noch keine Analysen — klicke auf &quot;Analysen generieren&quot;.</p>
              : recentAnalysen.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.bias === 'Bullisch' ? 'bg-green-500' : a.bias === 'Bärisch' ? 'bg-red-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.fazit}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${a.bias === 'Bullisch' ? 'text-green-600' : a.bias === 'Bärisch' ? 'text-red-500' : 'text-gray-400'}`}>{a.bias}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
