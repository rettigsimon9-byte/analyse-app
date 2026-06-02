'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Candle { time: string; open: number; high: number; low: number; close: number }

interface Props {
  ticker: string;
  einstiegMin: number;
  einstiegMax: number;
  ziel1: number;
  ziel2?: number | null;
  stopp: number;
  kurs?: number | null;
}

export default function ZielzonenChart({ ticker, einstiegMin, einstiegMax, ziel1, ziel2, stopp, kurs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'no-data'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setStatus('loading');
      if (!containerRef.current) return;

      let candles: Candle[] = [];
      try {
        const res = await fetch(`/api/historisch?ticker=${encodeURIComponent(ticker)}`);
        if (res.ok) candles = await res.json();
      } catch { /* ignore */ }

      if (cancelled || !containerRef.current) return;

      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      const width = containerRef.current.getBoundingClientRect().width || 700;

      const chart = createChart(containerRef.current, {
        width,
        height: 340,
        layout: { background: { color: '#ffffff' }, textColor: '#374151' },
        grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.08, bottom: 0.08 } },
        timeScale: { borderColor: '#e5e7eb', timeVisible: true, fixRightEdge: true },
      });
      chartRef.current = chart;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let series: any;

      if (candles.length > 0) {
        // Echte Kerzen
        series = chart.addCandlestickSeries({
          upColor: '#22c55e', downColor: '#ef4444',
          borderUpColor: '#22c55e', borderDownColor: '#ef4444',
          wickUpColor: '#22c55e', wickDownColor: '#ef4444',
        });
        series.setData(candles);
        setStatus('ok');
      } else {
        // Keine Kursdaten — unsichtbare Linie als Anker für die Preis-Levels
        series = chart.addLineSeries({ color: 'rgba(0,0,0,0)', lineWidth: 1 });
        // Anker-Daten so setzen dass die gesamte Zonen-Spanne sichtbar ist
        const allLevels = [stopp, einstiegMin, einstiegMax, ziel1, ...(ziel2 ? [ziel2] : []), ...(kurs ? [kurs] : [])];
        const minL = Math.min(...allLevels) * 0.96;
        const maxL = Math.max(...allLevels) * 1.04;
        const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const mid  = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to   = new Date().toISOString().split('T')[0];
        series.setData([
          { time: from, value: minL },
          { time: mid,  value: maxL },
          { time: to,   value: (minL + maxL) / 2 },
        ]);
        setStatus('no-data');
      }

      // Zonen einzeichnen (immer)
      series.createPriceLine({ price: einstiegMax, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'KZ Max' });
      series.createPriceLine({ price: einstiegMin, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'KZ Min' });
      series.createPriceLine({ price: ziel1,       color: '#2563eb', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Ziel 1' });
      if (ziel2) series.createPriceLine({ price: ziel2, color: '#7c3aed', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Ziel 2' });
      series.createPriceLine({ price: stopp,       color: '#dc2626', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Stopp' });
      if (kurs) series.createPriceLine({ price: kurs, color: '#111827', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'Kurs' });

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.getBoundingClientRect().width });
        }
      });
      ro.observe(containerRef.current);
    }

    init();
    return () => {
      cancelled = true;
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [ticker, einstiegMin, einstiegMax, ziel1, ziel2, stopp, kurs]);

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-green-600"></span>Kaufzone</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-blue-600"></span>Ziel 1</span>
          {ziel2 && <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-purple-600"></span>Ziel 2</span>}
          <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-red-600"></span>Stopp</span>
          {kurs && <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t border-gray-900"></span>Kurs</span>}
        </div>
        {status === 'no-data' && <span className="text-xs text-amber-500">Keine Kursdaten verfügbar — Zonen werden trotzdem angezeigt</span>}
        {status === 'loading' && <Loader2 size={13} className="animate-spin text-gray-400" />}
      </div>
      <div ref={containerRef} className="w-full bg-white" />
    </div>
  );
}
