'use client';
import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, X, Check } from 'lucide-react';
import { STATUS_COLORS, fmtKurs, ASSETS } from '@/app/lib/assets';

interface Zielzone {
  id: string; symbol: string; name: string; markt: string;
  kurs: number | null; einstiegMin: number; einstiegMax: number;
  ziel1: number; ziel2: number | null; stopp: number;
  status: string; aktiv: boolean; createdAt: string;
}

const STATI = ['Im Bereich', 'Auf dem Weg', 'Alternativszenario', 'Erreicht', 'Gestoppt'];

export default function ZielzonenPage() {
  const [zielzonen, setZielzonen] = useState<Zielzone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ symbol: 'DAX', name: 'DAX 40', markt: 'Indizes', ticker: '^GDAXI', einstiegMin: '', einstiegMax: '', ziel1: '', ziel2: '', stopp: '' });

  useEffect(() => {
    fetch('/api/zielzonen?aktiv=false').then(r => r.json()).then(d => { setZielzonen(d); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const asset = ASSETS.find(a => a.symbol === form.symbol);
    const res = await fetch('/api/zielzonen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, name: asset?.name ?? form.name, markt: asset?.markt ?? form.markt, ticker: asset?.ticker ?? '',
        einstiegMin: +form.einstiegMin, einstiegMax: +form.einstiegMax,
        ziel1: +form.ziel1, ziel2: form.ziel2 ? +form.ziel2 : null, stopp: +form.stopp,
      }),
    });
    const zz = await res.json();
    setZielzonen(prev => [zz, ...prev]);
    setShowForm(false); setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/zielzonen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, aktiv: !['Erreicht', 'Gestoppt'].includes(status) }) });
    setZielzonen(prev => prev.map(z => z.id === id ? { ...z, status, aktiv: !['Erreicht', 'Gestoppt'].includes(status) } : z));
  };

  const del = async (id: string) => {
    await fetch('/api/zielzonen', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setZielzonen(prev => prev.filter(z => z.id !== id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Zielzonen</h1><p className="text-gray-500 text-sm mt-0.5">{zielzonen.filter(z => z.aktiv).length} aktive Zonen</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
          <Plus size={15} /> Neue Zielzone
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Neue Zielzone anlegen</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 font-medium">Asset</label>
              <select value={form.symbol} onChange={e => { const a = ASSETS.find(x => x.symbol === e.target.value); setForm(f => ({ ...f, symbol: e.target.value, name: a?.name ?? '', markt: a?.markt ?? '', ticker: a?.ticker ?? '' })); }}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.name}</option>)}
              </select>
            </div>
            {[['einstiegMin','Einstieg Min'],['einstiegMax','Einstieg Max'],['ziel1','Ziel 1'],['ziel2','Ziel 2 (opt.)'],['stopp','Stopp']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Abbrechen</button>
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
          ? <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400">Noch keine Zielzonen vorhanden.</p></div>
          : <div className="space-y-3">
              {zielzonen.map(z => (
                <div key={z.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${!z.aktiv ? 'opacity-60' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">{z.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{z.markt}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[z.status] || 'bg-gray-100 text-gray-600'}`}>{z.status}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { l: 'Einstieg', v: `${fmtKurs(z.einstiegMin, z.symbol)} – ${fmtKurs(z.einstiegMax, z.symbol)}`, c: 'text-green-700 bg-green-50' },
                          { l: 'Ziel 1', v: fmtKurs(z.ziel1, z.symbol), c: 'text-blue-700 bg-blue-50' },
                          { l: 'Ziel 2', v: z.ziel2 ? fmtKurs(z.ziel2, z.symbol) : '–', c: 'text-blue-700 bg-blue-50' },
                          { l: 'Stopp', v: fmtKurs(z.stopp, z.symbol), c: 'text-red-700 bg-red-50' },
                        ].map(({ l, v, c }) => (
                          <div key={l} className={`${c} rounded-lg px-3 py-2`}>
                            <p className="text-xs font-semibold opacity-70">{l}</p>
                            <p className="text-sm font-bold">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <select value={z.status} onChange={e => updateStatus(z.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white">
                        {STATI.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => del(z.id)} className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-600 py-1">
                        <Trash2 size={12} /> Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
    </div>
  );
}
