'use client';
import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, X, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { ASSETS, fmtKurs } from '@/app/lib/assets';

interface Position {
  id: string; depot: string; symbol: string; name: string; ticker: string;
  einstand: number; anzahl: number; ziel: number | null; stopp: number | null;
  status: string; createdAt: string;
}
interface Preise { [ticker: string]: { kurs: number; changePct: number } | null }

export default function PortfolioPage() {
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [preise, setPreise] = useState<Preise>({});
  const [depot, setDepot] = useState<'investmentdepot' | 'tradingdepot'>('investmentdepot');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ symbol: 'DAX', name: 'DAX 40', ticker: '^GDAXI', einstand: '', anzahl: '', ziel: '', stopp: '' });

  const load = async () => {
    const pos: Position[] = await fetch('/api/portfolio').then(r => r.json());
    setPositionen(pos);
    const tickers = Array.from(new Set(pos.map(p => p.ticker).filter(Boolean))).join(',');
    if (tickers) {
      const p = await fetch(`/api/preise?tickers=${tickers}`).then(r => r.json());
      setPreise(p);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const asset = ASSETS.find(a => a.symbol === form.symbol);
    await fetch('/api/portfolio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, depot, name: asset?.name ?? form.name, ticker: asset?.ticker ?? '', einstand: +form.einstand, anzahl: +form.anzahl, ziel: form.ziel ? +form.ziel : null, stopp: form.stopp ? +form.stopp : null }),
    });
    await load(); setShowForm(false); setSaving(false);
  };

  const close = async (id: string) => {
    await fetch('/api/portfolio', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'geschlossen' }) });
    setPositionen(prev => prev.map(p => p.id === id ? { ...p, status: 'geschlossen' } : p));
  };

  const del = async (id: string) => {
    await fetch('/api/portfolio', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setPositionen(prev => prev.filter(p => p.id !== id));
  };

  const gefiltered = positionen.filter(p => p.depot === depot);
  const gesamtInvest = gefiltered.filter(p => p.status === 'offen').reduce((s, p) => s + p.einstand * p.anzahl, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-500 text-sm mt-0.5">Investiert: {gesamtInvest.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
          <Plus size={15} /> Position hinzufügen
        </button>
      </div>

      {/* Depot-Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {(['investmentdepot', 'tradingdepot'] as const).map(d => (
          <button key={d} onClick={() => setDepot(d)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${depot === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {d === 'investmentdepot' ? 'Investmentdepot' : 'Tradingdepot'}
          </button>
        ))}
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Position hinzufügen ({depot === 'investmentdepot' ? 'Investmentdepot' : 'Tradingdepot'})</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 font-medium">Asset</label>
              <select value={form.symbol} onChange={e => { const a = ASSETS.find(x => x.symbol === e.target.value); setForm(f => ({ ...f, symbol: e.target.value, name: a?.name ?? '', ticker: a?.ticker ?? '' })); }}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.name}</option>)}
              </select>
            </div>
            {[['einstand','Einstandskurs'],['anzahl','Anzahl / Kontrakte'],['ziel','Zielkurs (opt.)'],['stopp','Stopp-Loss (opt.)']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Abbrechen</button>
            <button onClick={save} disabled={saving || !form.einstand || !form.anzahl}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Speichern
            </button>
          </div>
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                {['Asset','Einstand','Anzahl','Aktuell','G/V','Ziel','Stopp','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {gefiltered.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Keine Positionen im {depot === 'investmentdepot' ? 'Investmentdepot' : 'Tradingdepot'}.</td></tr>
                  : gefiltered.map(pos => {
                      const aktuell = preise[pos.ticker]?.kurs ?? null;
                      const invest = pos.einstand * pos.anzahl;
                      const wert = aktuell ? aktuell * pos.anzahl : null;
                      const gv = wert ? wert - invest : null;
                      const gvPct = gv ? (gv / invest) * 100 : null;
                      return (
                        <tr key={pos.id} className={`hover:bg-gray-50 ${pos.status === 'geschlossen' ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">{pos.name}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtKurs(pos.einstand, pos.symbol)}</td>
                          <td className="px-4 py-3 text-gray-600">{pos.anzahl}</td>
                          <td className="px-4 py-3 font-medium">{aktuell ? fmtKurs(aktuell, pos.symbol) : '–'}</td>
                          <td className="px-4 py-3">
                            {gv != null ? (
                              <span className={`flex items-center gap-1 font-semibold ${gv >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {gv >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {gvPct?.toFixed(1)}%
                              </span>
                            ) : '–'}
                          </td>
                          <td className="px-4 py-3 text-blue-600">{pos.ziel ? fmtKurs(pos.ziel, pos.symbol) : '–'}</td>
                          <td className="px-4 py-3 text-red-500">{pos.stopp ? fmtKurs(pos.stopp, pos.symbol) : '–'}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pos.status === 'offen' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pos.status}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {pos.status === 'offen' && <button onClick={() => close(pos.id)} className="text-xs text-gray-400 hover:text-gray-600">Schließen</button>}
                              <button onClick={() => del(pos.id)}><Trash2 size={13} className="text-red-300 hover:text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>}
    </div>
  );
}
