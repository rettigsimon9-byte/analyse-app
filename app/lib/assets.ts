export interface Asset {
  symbol: string;
  name: string;
  ticker: string;
  markt: 'Indizes' | 'Rohstoffe' | 'Krypto' | 'Devisen' | 'Aktien';
  flag?: string;
}

export const ASSETS: Asset[] = [
  // Indizes
  { symbol: 'DAX',    name: 'DAX 40',      ticker: '^GDAXI',  markt: 'Indizes' },
  { symbol: 'SP500',  name: 'S&P 500',     ticker: '^GSPC',   markt: 'Indizes' },
  { symbol: 'DOW',    name: 'Dow Jones',   ticker: '^DJI',    markt: 'Indizes' },
  { symbol: 'NDX',    name: 'NASDAQ 100',  ticker: '^NDX',    markt: 'Indizes' },
  // Rohstoffe
  { symbol: 'GOLD',   name: 'Gold',        ticker: 'GC=F',    markt: 'Rohstoffe' },
  { symbol: 'SILBER', name: 'Silber',      ticker: 'SI=F',    markt: 'Rohstoffe' },
  { symbol: 'OEL',    name: 'Öl (WTI)',   ticker: 'CL=F',    markt: 'Rohstoffe' },
  // Krypto
  { symbol: 'BTC',    name: 'Bitcoin',     ticker: 'BTC-USD', markt: 'Krypto' },
  { symbol: 'ETH',    name: 'Ethereum',    ticker: 'ETH-USD', markt: 'Krypto' },
  // Devisen
  { symbol: 'EURUSD', name: 'EUR/USD',     ticker: 'EURUSD=X',markt: 'Devisen' },
  { symbol: 'GBPUSD', name: 'GBP/USD',     ticker: 'GBPUSD=X',markt: 'Devisen' },
];

export const MARKTS = ['Alle', 'Indizes', 'Rohstoffe', 'Krypto', 'Devisen', 'Aktien'] as const;

export function fmtKurs(kurs: number | null | undefined, symbol?: string): string {
  if (!kurs) return '–';
  if (symbol && ['BTC','ETH'].includes(symbol)) {
    return kurs.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' $';
  }
  if (symbol && ['EURUSD','GBPUSD'].includes(symbol)) {
    return kurs.toFixed(4);
  }
  return kurs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const STATUS_COLORS: Record<string, string> = {
  'Im Bereich':       'bg-green-100 text-green-700',
  'Auf dem Weg':      'bg-blue-100 text-blue-700',
  'Alternativszenario': 'bg-yellow-100 text-yellow-700',
  'Erreicht':         'bg-purple-100 text-purple-700',
  'Gestoppt':         'bg-red-100 text-red-700',
};

export const BIAS_COLORS: Record<string, string> = {
  'Bullisch': 'text-green-600',
  'Bärisch':  'text-red-600',
  'Neutral':  'text-gray-500',
};
