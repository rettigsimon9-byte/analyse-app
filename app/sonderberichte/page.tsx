'use client';
import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, X, Check, Star } from 'lucide-react';

interface Bericht { id: string; titel: string; untertitel: string; inhalt: string; kategorie: string; featured: boolean; createdAt: string }

export default function SonderberichtePage() {
  const [berichte, setBerichte] = useState<Bericht[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [thema, setThema] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const data = await fetch('/api/sonderberichte').then(r => r.json());
    setBerichte(data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: 'sonderbericht', thema }) });
    await load(); setGenerating(false); setShowForm(false); setThema('');
  };

  const del = async (id: string) => {
    await fetch('/api/sonderberichte', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBerichte(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Sonderberichte</h1><p className="text-gray-500 text-sm mt-0.5">{berichte.length} Berichte</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold">
          <Plus size={15} /> Bericht erstellen
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Neuen Sonderbericht erstellen (KI)</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <input value={thema} onChange={e => setThema(e.target.value)} placeholder="Thema z.B. 'DAX-Ausblick Q3', 'Gold-Analyse', 'Rezessionsrisiken'"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 mb-3" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Abbrechen</button>
            <button onClick={generate} disabled={generating || !thema}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5">
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {generating ? 'KI schreibt…' : 'Erstellen'}
            </button>
          </div>
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : berichte.length === 0
          ? <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400">Noch keine Sonderberichte.</p></div>
          : <div className="space-y-4">
              {berichte.map(b => (
                <div key={b.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${b.featured ? 'border-amber-200' : 'border-gray-100'}`}>
                  <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="w-full text-left p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {b.featured && <Star size={14} className="text-amber-500 fill-amber-500" />}
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{b.kategorie}</span>
                          <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        <h3 className="font-bold text-gray-900">{b.titel}</h3>
                        {b.untertitel && <p className="text-sm text-gray-500 mt-0.5">{b.untertitel}</p>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); del(b.id); }}><Trash2 size={14} className="text-gray-300 hover:text-red-400" /></button>
                    </div>
                  </button>
                  {expanded === b.id && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{b.inhalt}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>}
    </div>
  );
}
