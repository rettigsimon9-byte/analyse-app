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
    if (!containerRef.current) return;
    let cancelled = false;

    fetch(`/api/historisch?ticker=${ticker}`)
      .then(r => r.json())
      .then(async (candles: Candle[]) => {
        if (cancelled || !containerRef.current || candles.length === 0) return;

        const { createChart, ColorType, LineStyle } = await import('lightweight-charts');

        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 320,
          layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#374151' },
          grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
          crosshair: { mode: 1 },
          rightPriceScale: { borderColor: '#e5e7eb' },
          timeScale: { borderColor: '#e5e7eb', timeVisible: true },
          handleScale: { mouseWheel: true, pinch: true },
        });
        chartRef.current = chart;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = (chart as any).addCandlestickSeries({
          upColor: '#22c55e', downColor: '#ef4444',
          borderUpColor: '#22c55e', borderDownColor: '#ef4444',
          wickUpColor: '#22c55e', wickDownColor: '#ef4444',
        });
        series.setData(candles);

        // Kaufzone (grün gestrichelt)
        series.createPriceLine({ price: einstiegMax, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Kaufzone Max ${einstiegMax}` });
        series.createPriceLine({ price: einstiegMin, color: '#16a34a', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Kaufzone Min ${einstiegMin}` });

        // Ziel 1 (blau)
        series.createPriceLine({ price: ziel1, color: '#2563eb', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Ziel 1  ${ziel1}` });

        // Ziel 2 (lila, optional)
        if (ziel2) {
          series.createPriceLine({ price: ziel2, color: '#7c3aed', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Ziel 2  ${ziel2}` });
        }

        // Stopp (rot)
        series.createPriceLine({ price: stopp, color: '#dc2626', lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `Stopp  ${stopp}` });

        // Aktueller Kurs (schwarz)
        if (kurs) {
          series.createPriceLine({ price: kurs, color: '#111827', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: `Aktuell  ${kurs}` });
        }

        chart.timeScale().fitContent();
      });

    return () => {
      cancelled = true;
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [ticker, einstiegMin, einstiegMax, ziel1, ziel2, stopp, kurs]);

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-600 inline-block border-dashed"></span> Kaufzone</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600 inline-block"></span> Ziel 1</span>
        {ziel2 && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-600 inline-block"></span> Ziel 2</span>}
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-600 inline-block"></span> Stopp</span>
        {kurs && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-900 inline-block"></span> Kurs</span>}
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
