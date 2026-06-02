'use client';
import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, X, Check, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { STATUS_COLORS, fmtKurs, ASSETS } from '@/app/lib/assets';
import dynamic from 'next/dynamic';

const ZielzonenChart = dynamic(() => import('@/components/ZielzonenChart'), { ssr: false });

interface Zielzone {
  id: string; symbol: string; name: string; markt: string; ticker: string;
  kurs: number | null; einstiegMin: number; einstiegMax: number;
  ziel1: number; ziel2: number | null; stopp: number;
  status: string; aktiv: boolean; createdAt: string;
}
interface LivePreis { kurs: number; change: number; changePct: number }

const STATI = ['Im Bereich', 'Auf dem Weg', 'Alternativszenario', 'Erreicht', 'Gestoppt'];

function priceStatus(kurs: number | null, z: Zielzone): 'im_bereich' | 'nah' | 'weit' | 'ueber_ziel' | 'unter_stopp' | 'unbekannt' {
  if (!kurs) return 'unbekannt';
  if (kurs < z.stopp) return 'unter_stopp';
  if (kurs >= z.einstiegMin && kurs <= z.einstiegMax) return 'im_bereich';
  if (kurs > z.ziel1) return 'ueber_ziel';
  const distPct = Math.abs(kurs - z.einstiegMax) / z.einstiegMax * 100;
  if (distPct < 3) return 'nah';
  return 'weit';
}

function PriceBar({ z, kurs }: { z: Zielzone; kurs: number | null }) {
  if (!kurs) return null;
  const min = z.stopp * 0.97;
  const max = (z.ziel2 ?? z.ziel1) * 1.03;
  const range = max - min;
  const clamp = (v: number) => Math.max(0, Math.min(100, (v - min) / range * 100));
  const pos = clamp(kurs);
  const stopPct = clamp(z.stopp);
  const kaufMinPct = clamp(z.einstiegMin);
  const kaufMaxPct = clamp(z.einstiegMax);
  const ziel1Pct = clamp(z.ziel1);
  const ziel2Pct = z.ziel2 ? clamp(z.ziel2) : null;

  return (
    <div className="mt-3">
      <div className="relative h-6 rounded-full bg-gray-100 overflow-visible mx-1">
        {/* Kaufzone Band */}
        <div className="absolute top-0 h-full bg-green-100 rounded" style={{ left: `${kaufMinPct}%`, width: `${kaufMaxPct - kaufMinPct}%` }} />
        {/* Stopp Linie */}
        <div className="absolute top-0 h-full w-0.5 bg-red-400" style={{ left: `${stopPct}%` }} />
        {/* Ziel 1 Linie */}
        <div className="absolute top-0 h-full w-0.5 bg-blue-400" style={{ left: `${ziel1Pct}%` }} />
        {/* Ziel 2 Linie */}
        {ziel2Pct && <div className="absolute top-0 h-full w-0.5 bg-purple-400" style={{ left: `${ziel2Pct}%` }} />}
        {/* Aktueller Kurs */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
          <div className="w-3 h-3 rounded-full bg-gray-900 border-2 border-white shadow-md" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span className="text-red-500">S {fmtKurs(z.stopp, z.symbol)}</span>
        <span className="text-green-600">KZ {fmtKurs(z.einstiegMin, z.symbol)}–{fmtKurs(z.einstiegMax, z.symbol)}</span>
        <span className="text-blue-500">Z1 {fmtKurs(z.ziel1, z.symbol)}</span>
        {z.ziel2 && <span className="text-purple-500">Z2 {fmtKurs(z.ziel2, z.symbol)}</span>}
      </div>
    </div>
  );
}

export default function ZielzonenPage() {
  const [zielzonen, setZielzonen] = useState<Zielzone[]>([]);
  const [preise, setPreise] = useState<Record<string, LivePreis>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<string | null>(null);
  const [form, setForm] = useState({ symbol: 'DAX', einstiegMin: '', einstiegMax: '', ziel1: '', ziel2: '', stopp: '' });

  const loadData = async () => {
    const zz: Zielzone[] = await fetch('/api/zielzonen?aktiv=false').then(r => r.json());
    setZielzonen(zz);
    const tickers = Array.from(new Set(zz.map(z => z.ticker).filter(Boolean))).join(',');
    if (tickers) {
      const p = await fetch(`/api/preise?tickers=${tickers}`).then(r => r.json());
      setPreise(p);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Auto-Status aktualisieren basierend auf aktuellem Kurs
  useEffect(() => {
    if (!Object.keys(preise).length) return;
    zielzonen.forEach(z => {
      const lp = preise[z.ticker];
      if (!lp || !z.aktiv) return;
      const imBereich = lp.kurs >= z.einstiegMin && lp.kurs <= z.einstiegMax;
      const sollStatus = imBereich ? 'Im Bereich' : (z.status === 'Im Bereich' ? 'Auf dem Weg' : z.status);
      if (sollStatus !== z.status) {
        fetch('/api/zielzonen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: z.id, status: sollStatus }) });
        setZielzonen(prev => prev.map(x => x.id === z.id ? { ...x, status: sollStatus } : x));
      }
    });
  }, [preise, zielzonen]);

  const save = async () => {
    setSaving(true);
    const asset = ASSETS.find(a => a.symbol === form.symbol);
    await fetch('/api/zielzonen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: form.symbol, name: asset?.name ?? form.symbol, markt: asset?.markt ?? 'Aktien', ticker: asset?.ticker ?? '',
        einstiegMin: +form.einstiegMin, einstiegMax: +form.einstiegMax,
        ziel1: +form.ziel1, ziel2: form.ziel2 ? +form.ziel2 : null, stopp: +form.stopp,
      }),
    });
    await loadData(); setShowForm(false); setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const aktiv = !['Erreicht', 'Gestoppt'].includes(status);
    await fetch('/api/zielzonen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, aktiv }) });
    setZielzonen(prev => prev.map(z => z.id === id ? { ...z, status, aktiv } : z));
  };

  const del = async (id: string) => {
    await fetch('/api/zielzonen', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setZielzonen(prev => prev.filter(z => z.id !== id));
  };

  const imBereichCount = zielzonen.filter(z => z.aktiv && priceStatus(preise[z.ticker]?.kurs, z) === 'im_bereich').length;
  const aktiveCount = zielzonen.filter(z => z.aktiv).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zielzonen</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            <span className="text-green-600 font-semibold">{imBereichCount} im Bereich</span>
            <span className="text-gray-400"> · {aktiveCount} aktiv · {zielzonen.length} gesamt</span>
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
          <Plus size={15} /> Neue Zielzone
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Neue Zielzone anlegen</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 font-medium">Asset</label>
              <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.name}</option>)}
              </select>
            </div>
            {[['einstiegMin','Einstieg Min'],['einstiegMax','Einstieg Max'],['ziel1','Ziel 1'],['ziel2','Ziel 2 (opt.)'],['stopp','Stopp']].map(([k, l]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{l}</label>
                <input type="number" value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.einstiegMin || !form.ziel1 || !form.stopp}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Speichern
            </button>
          </div>
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : zielzonen.length === 0
          ? <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400">Noch keine Zielzonen.</p></div>
          : <div className="space-y-3">
              {zielzonen.map(z => {
                const lp = preise[z.ticker];
                const kurs = lp?.kurs ?? null;
                const ps = priceStatus(kurs, z);
                const isExpanded = expanded === z.id;
                const hasChart = showChart === z.id;

                const statusBadge = {
                  im_bereich:    { label: '● Im Bereich',    cls: 'text-green-700 bg-green-100' },
                  nah:           { label: '◎ Nähert sich',   cls: 'text-yellow-700 bg-yellow-100' },
                  weit:          { label: '○ Auf dem Weg',   cls: 'text-blue-700 bg-blue-100' },
                  ueber_ziel:    { label: '✓ Über Ziel',     cls: 'text-purple-700 bg-purple-100' },
                  unter_stopp:   { label: '✕ Unter Stopp',   cls: 'text-red-700 bg-red-100' },
                  unbekannt:     { label: '? Unbekannt',     cls: 'text-gray-500 bg-gray-100' },
                }[ps];

                return (
                  <div key={z.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${!z.aktiv ? 'opacity-60' : 'border-gray-100'}`}>
                    <button onClick={() => setExpanded(isExpanded ? null : z.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors">
                      {/* Preisstatus-Indikator */}
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${ps === 'im_bereich' ? 'bg-green-500' : ps === 'unter_stopp' ? 'bg-red-500' : ps === 'nah' ? 'bg-yellow-400' : 'bg-gray-200'}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{z.name}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{z.markt}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
                          <span className="text-xs text-gray-400">{new Date(z.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        {/* Kompakte Zone-Übersicht */}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-green-700">KZ {fmtKurs(z.einstiegMin, z.symbol)}–{fmtKurs(z.einstiegMax, z.symbol)}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-blue-600">Z1 {fmtKurs(z.ziel1, z.symbol)}</span>
                          {z.ziel2 && <><span className="text-gray-300">|</span><span className="text-purple-500">Z2 {fmtKurs(z.ziel2, z.symbol)}</span></>}
                          <span className="text-gray-300">|</span>
                          <span className="text-red-500">S {fmtKurs(z.stopp, z.symbol)}</span>
                        </div>
                      </div>

                      {/* Aktueller Kurs */}
                      <div className="text-right flex-shrink-0">
                        {kurs ? (
                          <>
                            <p className="font-bold text-gray-900 text-sm">{fmtKurs(kurs, z.symbol)}</p>
                            <p className={`text-xs flex items-center justify-end gap-0.5 ${lp.changePct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {lp.changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {lp.changePct >= 0 ? '+' : ''}{lp.changePct?.toFixed(2)}%
                            </p>
                          </>
                        ) : <Minus size={16} className="text-gray-300 ml-auto" />}
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 pb-5 pt-3">
                        {/* Preis-Balken */}
                        <PriceBar z={z} kurs={kurs} />

                        {/* Zonen-Details */}
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          {[
                            { l: 'Einstieg', v: `${fmtKurs(z.einstiegMin, z.symbol)} – ${fmtKurs(z.einstiegMax, z.symbol)}`, c: 'text-green-700 bg-green-50' },
                            { l: 'Ziel 1', v: fmtKurs(z.ziel1, z.symbol), c: 'text-blue-700 bg-blue-50' },
                            { l: 'Ziel 2', v: z.ziel2 ? fmtKurs(z.ziel2, z.symbol) : '–', c: 'text-purple-700 bg-purple-50' },
                            { l: 'Stopp', v: fmtKurs(z.stopp, z.symbol), c: 'text-red-700 bg-red-50' },
                          ].map(({ l, v, c }) => (
                            <div key={l} className={`${c} rounded-lg px-3 py-2`}>
                              <p className="text-xs font-semibold opacity-70">{l}</p>
                              <p className="text-sm font-bold">{v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Chart-Toggle + Status */}
                        <div className="flex items-center gap-3 mt-4">
                          <button onClick={() => setShowChart(hasChart ? null : z.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                            <BarChart2 size={13} /> {hasChart ? 'Chart ausblenden' : 'Chart anzeigen'}
                          </button>
                          <select value={z.status} onChange={e => updateStatus(z.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                            {STATI.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <button onClick={() => del(z.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 ml-auto">
                            <Trash2 size={12} /> Löschen
                          </button>
                        </div>

                        {/* Chart */}
                        {hasChart && z.ticker && (
                          <ZielzonenChart
                            ticker={z.ticker}
                            einstiegMin={z.einstiegMin} einstiegMax={z.einstiegMax}
                            ziel1={z.ziel1} ziel2={z.ziel2}
                            stopp={z.stopp} kurs={kurs}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}
    </div>
  );
}
