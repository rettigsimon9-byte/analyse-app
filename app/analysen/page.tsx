'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { MARKTS, BIAS_COLORS, fmtKurs } from '@/app/lib/assets';

interface Analyse {
  id: string; symbol: string; name: string; markt: string;
  kurs: number | null; bias: string;
  kaufzoneMin: number | null; kaufzoneMax: number | null;
  zielzone1: number | null; zielzone2: number | null;
  stopp: number | null; einschaetzung: string; fazit: string;
  datum: string; generiert: boolean;
}

export default function AnalysenPage() {
  const [analysen, setAnalysen] = useState<Analyse[]>([]);
  const [marktFilter, setMarktFilter] = useState('Alle');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async (markt = marktFilter) => {
    setLoading(true);
    const url = markt === 'Alle' ? '/api/analysen' : `/api/analysen?markt=${markt}`;
    const data = await fetch(url).then(r => r.json());
    setAnalysen(data);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: 'analyse' }) });
    await load();
    setGenerating(false);
  };

  const filtered = marktFilter === 'Alle' ? analysen : analysen.filter(a => a.markt === marktFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysen</h1>
          <p className="text-gray-500 text-sm mt-0.5">{analysen.length} Analysen verfügbar</p>
        </div>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? 'KI generiert…' : 'Alle neu generieren'}
        </button>
      </div>

      {/* Markt-Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {MARKTS.map(m => (
          <button key={m} onClick={() => { setMarktFilter(m); load(m); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${marktFilter === m ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}>
            {m}
          </button>
        ))}
      </div>

      {loading
        ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : filtered.length === 0
          ? <div className="bg-white rounded-2xl p-12 text-center border border-gray-100"><p className="text-gray-400">Keine Analysen für diesen Markt. Klicke auf &quot;Alle neu generieren&quot;.</p></div>
          : <div className="space-y-3">
              {filtered.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors">
                    {/* Bias-Indikator */}
                    <div className={`w-1 h-12 rounded-full flex-shrink-0 ${a.bias === 'Bullisch' ? 'bg-green-500' : a.bias === 'Bärisch' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="font-bold text-gray-900">{a.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a.markt}</span>
                        {a.generiert && <span className="text-xs bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full">KI</span>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{a.fazit}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${BIAS_COLORS[a.bias] || 'text-gray-500'}`}>{a.bias}</p>
                      {a.kurs && <p className="text-xs text-gray-400">{fmtKurs(a.kurs, a.symbol)}</p>}
                    </div>
                    {expanded === a.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                  </button>

                  {expanded === a.id && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      {/* Zonen */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-xs text-green-700 font-semibold mb-1">Kaufzone</p>
                          <p className="text-sm font-bold text-green-800">
                            {a.kaufzoneMin && a.kaufzoneMax ? `${fmtKurs(a.kaufzoneMin, a.symbol)} – ${fmtKurs(a.kaufzoneMax, a.symbol)}` : '–'}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-blue-700 font-semibold mb-1">Zielzone</p>
                          <p className="text-sm font-bold text-blue-800">
                            {a.zielzone1 ? fmtKurs(a.zielzone1, a.symbol) : '–'}{a.zielzone2 ? ` / ${fmtKurs(a.zielzone2, a.symbol)}` : ''}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3">
                          <p className="text-xs text-red-700 font-semibold mb-1">Stopp-Loss</p>
                          <p className="text-sm font-bold text-red-800">{a.stopp ? fmtKurs(a.stopp, a.symbol) : '–'}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{a.einschaetzung}</p>
                      <p className="text-xs text-gray-400 mt-3">{new Date(a.datum).toLocaleString('de-DE')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>}
    </div>
  );
}
