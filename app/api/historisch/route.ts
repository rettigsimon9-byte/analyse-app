import { NextRequest, NextResponse } from 'next/server';

const cache: Record<string, { data: unknown[]; ts: number }> = {};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  if (!ticker) return NextResponse.json([]);

  const now = Date.now();
  if (cache[ticker] && now - cache[ticker].ts < 60 * 60 * 1000) {
    return NextResponse.json(cache[ticker].data);
  }

  try {
    const yf = (await import('yahoo-finance2')).default;
    const period1 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candles: any[] = [];

    // Methode 1: chart() — zuverlässiger in yahoo-finance2 v3
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (yf as any).chart(ticker, {
        period1,
        interval: '1d',
      }, { validateResult: false });

      const quotes = result?.quotes ?? result?.indicators?.quote?.[0] ?? [];
      candles = quotes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((q: any) => q?.close != null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((q: any) => ({
          time: (q.date instanceof Date ? q.date : new Date(q.date)).toISOString().split('T')[0],
          open:  Math.round((q.open  ?? q.close) * 100) / 100,
          high:  Math.round((q.high  ?? q.close) * 100) / 100,
          low:   Math.round((q.low   ?? q.close) * 100) / 100,
          close: Math.round(q.close               * 100) / 100,
        }));
    } catch { /* Fallback zu historical */ }

    // Methode 2: historical() als Fallback
    if (candles.length === 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = await (yf as any).historical(ticker, { period1, interval: '1d' }, { validateResult: false });
        candles = (raw ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r?.close != null)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            time:  (r.date instanceof Date ? r.date : new Date(r.date)).toISOString().split('T')[0],
            open:  Math.round(r.open  * 100) / 100,
            high:  Math.round(r.high  * 100) / 100,
            low:   Math.round(r.low   * 100) / 100,
            close: Math.round(r.close * 100) / 100,
          }));
      } catch { /* ignore */ }
    }

    // Duplikate nach Zeit entfernen und sortieren
    const seen = new Set<string>();
    candles = candles.filter(c => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    }).sort((a, b) => a.time.localeCompare(b.time));

    cache[ticker] = { data: candles, ts: now };
    return NextResponse.json(candles);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`historisch [${ticker}]:`, msg);
    return NextResponse.json([]);
  }
}
