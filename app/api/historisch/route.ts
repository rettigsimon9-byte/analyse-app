import { NextRequest, NextResponse } from 'next/server';

// 1h Cache pro Ticker
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
    let raw: any[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw = await (yf.historical as any)(ticker, { period1, interval: '1d' }, { validateResult: false });
    } catch { raw = []; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candles = (raw || []).filter((r: any) => r.close != null).map((r: any) => ({
      time: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      open:  Math.round(r.open  * 100) / 100,
      high:  Math.round(r.high  * 100) / 100,
      low:   Math.round(r.low   * 100) / 100,
      close: Math.round(r.close * 100) / 100,
    }));

    cache[ticker] = { data: candles, ts: now };
    return NextResponse.json(candles);
  } catch {
    return NextResponse.json([]);
  }
}
