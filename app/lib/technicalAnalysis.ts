// Technische Indikatoren auf Basis echter OHLCV-Daten

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalData {
  symbol: string;
  name: string;
  kurs: number | null;
  // Moving Averages
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  // Momentum
  rsi14: number | null;
  // Key Levels
  hoch30: number | null;
  tief30: number | null;
  hoch90: number | null;
  tief90: number | null;
  // Volatilität
  atr14: number | null;
  // Trend
  trend: 'Bullisch' | 'Bärisch' | 'Seitwärts';
  // Rohdaten für Kontext
  candles: OHLCV[];
}

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
}

function calcATR(candles: OHLCV[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    ));
  }
  const recent = trs.slice(-period);
  return Math.round(recent.reduce((a, b) => a + b, 0) / period * 100) / 100;
}

function determineTrend(kurs: number, ma20: number | null, ma50: number | null, ma200: number | null): 'Bullisch' | 'Bärisch' | 'Seitwärts' {
  const above = [ma20, ma50, ma200].filter(m => m != null && kurs > m).length;
  const below = [ma20, ma50, ma200].filter(m => m != null && kurs < m).length;
  if (above >= 2) return 'Bullisch';
  if (below >= 2) return 'Bärisch';
  return 'Seitwärts';
}

export async function fetchTechnicalData(ticker: string, symbol: string, name: string): Promise<TechnicalData> {
  const empty: TechnicalData = { symbol, name, kurs: null, ma20: null, ma50: null, ma200: null, rsi14: null, hoch30: null, tief30: null, hoch90: null, tief90: null, atr14: null, trend: 'Seitwärts', candles: [] };

  try {
    const yf = (await import('yahoo-finance2')).default;
    const period1 = new Date(Date.now() - 220 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any[] = [];
    try { raw = await (yf.historical as any)(ticker, { period1, interval: '1d' }, { validateResult: false }); } catch { raw = []; }
    if (!raw || raw.length < 20) return empty;

    const candles: OHLCV[] = raw
      .filter(r => r.close != null)
      .map(r => ({ date: r.date, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0 }));

    if (candles.length < 20) return empty;

    const closes = candles.map(c => c.close);
    const highs  = candles.map(c => c.high);
    const lows   = candles.map(c => c.low);
    const kurs   = closes[closes.length - 1];

    const ma20  = calcSMA(closes, 20);
    const ma50  = calcSMA(closes, 50);
    const ma200 = calcSMA(closes, 200);
    const rsi14 = calcRSI(closes);
    const atr14 = calcATR(candles);

    const last30H = highs.slice(-30);
    const last30L = lows.slice(-30);
    const last90H = highs.slice(-90);
    const last90L = lows.slice(-90);

    return {
      symbol, name, kurs,
      ma20:   ma20  ? Math.round(ma20  * 100) / 100 : null,
      ma50:   ma50  ? Math.round(ma50  * 100) / 100 : null,
      ma200:  ma200 ? Math.round(ma200 * 100) / 100 : null,
      rsi14, atr14,
      hoch30: last30H.length ? Math.max(...last30H) : null,
      tief30: last30L.length ? Math.min(...last30L) : null,
      hoch90: last90H.length ? Math.max(...last90H) : null,
      tief90: last90L.length ? Math.min(...last90L) : null,
      trend: determineTrend(kurs, ma20, ma50, ma200),
      candles,
    };
  } catch {
    return empty;
  }
}

export function formatTechnicalContext(td: TechnicalData): string {
  const fmt = (n: number | null, decimals = 2) =>
    n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : 'n/v';

  const pct = (kurs: number | null, ma: number | null) => {
    if (!kurs || !ma) return '';
    const p = ((kurs - ma) / ma * 100);
    return ` (${p >= 0 ? '+' : ''}${p.toFixed(1)}%)`;
  };

  const k = td.kurs;
  const lines = [
    `=== TECHNISCHE ANALYSE: ${td.name} (${td.symbol}) ===`,
    `Datum: ${new Date().toLocaleDateString('de-DE')}`,
    `Aktueller Kurs: ${fmt(k)}`,
    ``,
    `GLEITENDE DURCHSCHNITTE:`,
    `  MA20:  ${fmt(td.ma20)} → Kurs ${k && td.ma20 ? (k > td.ma20 ? 'ÜBER' : 'UNTER') : 'n/v'} MA20${pct(k, td.ma20)}`,
    `  MA50:  ${fmt(td.ma50)} → Kurs ${k && td.ma50 ? (k > td.ma50 ? 'ÜBER' : 'UNTER') : 'n/v'} MA50${pct(k, td.ma50)}`,
    `  MA200: ${fmt(td.ma200)} → Kurs ${k && td.ma200 ? (k > td.ma200 ? 'ÜBER' : 'UNTER') : 'n/v'} MA200${pct(k, td.ma200)}`,
    `  Trend: ${td.trend.toUpperCase()}`,
    ``,
    `MOMENTUM:`,
    `  RSI(14): ${td.rsi14 ?? 'n/v'} → ${td.rsi14 == null ? '' : td.rsi14 < 30 ? 'ÜBERVERKAUFT' : td.rsi14 > 70 ? 'ÜBERKAUFT' : td.rsi14 < 45 ? 'schwach' : td.rsi14 > 55 ? 'stark' : 'neutral'}`,
    ``,
    `KEY-LEVELS (echte Kursdaten):`,
    `  30-Tage-Hoch:  ${fmt(td.hoch30)} → Widerstand`,
    `  30-Tage-Tief:  ${fmt(td.tief30)} → Support`,
    `  90-Tage-Hoch:  ${fmt(td.hoch90)} → Starker Widerstand`,
    `  90-Tage-Tief:  ${fmt(td.tief90)} → Starker Support`,
    ``,
    `VOLATILITÄT:`,
    `  ATR(14): ${fmt(td.atr14)} (durchschnittliche Tagesrange)`,
  ];
  return lines.join('\n');
}
