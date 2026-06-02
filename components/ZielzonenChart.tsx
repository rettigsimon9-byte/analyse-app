'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const candles: Candle[] = await fetch(`/api/historisch?ticker=${encodeURIComponent(ticker)}`)
        .then(r => r.json())
        .catch(() => []);

      if (cancelled || !containerRef.current || candles.length === 0) return;

      // Vorherige Chart-Instanz aufräumen
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      const width = containerRef.current.getBoundingClientRect().width || 600;

      const chart = createChart(containerRef.current, {
        width,
        height: 340,
        layout: { background: { color: '#ffffff' }, textColor: '#374151' },
        grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#e5e7eb', timeVisible: true, fixRightEdge: true },
      });
      chartRef.current = chart;

      // Kerzen
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      });
      candleSeries.setData(candles);

      // Kaufzone (grün, 2 gestrichelte Linien)
      candleSeries.createPriceLine({ price: einstiegMax, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `KZ Max` });
      candleSeries.createPriceLine({ price: einstiegMin, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `KZ Min` });

      // Ziel 1 (blau)
      candleSeries.createPriceLine({ price: ziel1, color: '#2563eb', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Ziel 1` });

      // Ziel 2 (lila, optional)
      if (ziel2) {
        candleSeries.createPriceLine({ price: ziel2, color: '#7c3aed', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Ziel 2` });
      }

      // Stopp (rot)
      candleSeries.createPriceLine({ price: stopp, color: '#dc2626', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Stopp` });

      // Aktueller Kurs (schwarz, durchgezogen)
      if (kurs) {
        candleSeries.createPriceLine({ price: kurs, color: '#111827', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: `Kurs` });
      }

      chart.timeScale().fitContent();

      // Responsive resize
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.resize(containerRef.current.getBoundingClientRect().width, 340);
        }
      });
      if (containerRef.current) ro.observe(containerRef.current);
    }

    init();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ticker, einstiegMin, einstiegMax, ziel1, ziel2, stopp, kurs]);

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-green-600"></span>Kaufzone</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-blue-600"></span>Ziel 1</span>
        {ziel2 && <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-purple-600"></span>Ziel 2</span>}
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-red-600"></span>Stopp</span>
        {kurs && <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-gray-900"></span>Aktuell</span>}
      </div>
      <div ref={containerRef} className="w-full bg-white" />
    </div>
  );
}
