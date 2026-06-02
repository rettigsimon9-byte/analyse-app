'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, Trash2, AlertCircle } from 'lucide-react';

interface News { id: string; titel: string; inhalt: string; kategorie: string; wichtig: boolean; createdAt: string }

const KAT_COLOR: Record<string, string> = {
  'Markt': 'bg-blue-100 text-blue-700', 'Rohstoffe': 'bg-amber-100 text-amber-700',
  'Krypto': 'bg-purple-100 text-purple-700', 'Devisen': 'bg-green-100 text-green-700',
};

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const data = await fetch('/api/news').then(r => r.json());
    setNews(data); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: 'news' }) });
    await load(); setGenerating(false);
  };

  const del = async (id: string) => {
    await fetch('/api/news', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNews(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">HKCM News</h1><p className="text-gray-500 text-sm mt-0.5">{news.length} Beiträge</p></div>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? 'KI schreibt…' : 'News generieren'}
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : news.length === 0
          ? <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400">Noch keine News. Klicke auf &quot;News generieren&quot;.</p></div>
          : <div className="space-y-4">
              {news.map(n => (
                <div key={n.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${n.wichtig ? 'border-amber-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {n.wichtig && <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KAT_COLOR[n.kategorie] || 'bg-gray-100 text-gray-600'}`}>{n.kategorie}</span>
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('de-DE')}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{n.titel}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{n.inhalt}</p>
                    </div>
                    <button onClick={() => del(n.id)}><Trash2 size={14} className="text-gray-300 hover:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>}
    </div>
  );
}
