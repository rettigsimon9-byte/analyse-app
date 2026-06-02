import { NextRequest, NextResponse } from 'next/server';

// Cache: Kurse für 5 Minuten speichern
const cache: { data: Record<string, unknown>; ts: number } = { data: {}, ts: 0 };

export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get('tickers')?.split(',') ?? [];
  if (!tickers.length) return NextResponse.json({});

  const now = Date.now();
  // Cache noch gültig?
  if (now - cache.ts < 5 * 60 * 1000 && tickers.every(t => t in cache.data)) {
    const result: Record<string, unknown> = {};
    tickers.forEach(t => { result[t] = cache.data[t]; });
    return NextResponse.json(result);
  }

  try {
    const yf = (await import('yahoo-finance2')).default;
    const result: Record<string, unknown> = {};

    await Promise.all(tickers.map(async ticker => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yf.quote(ticker);
        result[ticker] = {
          kurs: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePct: q.regularMarketChangePercent ?? null,
          name: q.shortName ?? q.longName ?? ticker,
        };
        cache.data[ticker] = result[ticker];
      } catch {
        result[ticker] = null;
      }
    }));

    cache.ts = now;
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
