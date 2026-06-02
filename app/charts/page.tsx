'use client';
import { useState } from 'react';
import { ASSETS } from '@/app/lib/assets';

const TV_SYMBOLS: Record<string, string> = {
  '^GDAXI': 'XETR:DAX', '^GSPC': 'SP:SPX', '^DJI': 'DJ:DJI', '^NDX': 'NASDAQ:NDX',
  'GC=F': 'COMEX:GC1!', 'SI=F': 'COMEX:SI1!', 'CL=F': 'NYMEX:CL1!',
  'BTC-USD': 'BITSTAMP:BTCUSD', 'ETH-USD': 'BITSTAMP:ETHUSD',
  'EURUSD=X': 'FX:EURUSD', 'GBPUSD=X': 'FX:GBPUSD',
};

export default function ChartsPage() {
  const [selected, setSelected] = useState(ASSETS[0]);

  const tvSymbol = TV_SYMBOLS[selected.ticker] ?? selected.ticker;
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=${encodeURIComponent(tvSymbol)}&interval=D&theme=light&style=1&locale=de_DE&toolbar_bg=f1f3f6&hide_side_toolbar=0&allow_symbol_change=0&details=1&studies=[]&withdateranges=1`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Unsere Charts</h1>
        <p className="text-gray-500 text-sm mt-0.5">Live-Charts via TradingView</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {ASSETS.map(a => (
          <button key={a.symbol} onClick={() => setSelected(a)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selected.symbol === a.symbol ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}>
            {a.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 600 }}>
        <iframe
          key={tvSymbol}
          src={src}
          width="100%" height="100%"
          frameBorder="0" allowTransparency allowFullScreen
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
