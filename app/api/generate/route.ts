import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ASSETS } from '@/app/lib/assets';

const client = new Anthropic();

async function getPreise(tickers: string[]): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yf = require('yahoo-finance2').default;
    await Promise.all(tickers.map(async ticker => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yf.quote(ticker);
        result[ticker] = q.regularMarketPrice ?? null;
      } catch {
        result[ticker] = null;
      }
    }));
  } catch {
    tickers.forEach(t => { result[t] = null; });
  }
  return result;
}

export async function POST(req: NextRequest) {
  // Body einmalig lesen
  const body = await req.json();
  const { symbols, typ, thema } = body;

  try {
    // ---- NEWS ----
    if (typ === 'news') {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: `Erstelle 5 aktuelle Markt-News auf Deutsch (Stand heute).
Jede News: Titel + 2-3 Sätze Inhalt. Relevante Themen: Aktien, Indizes, Rohstoffe, Notenbanken, Konjunktur.
Antworte NUR mit JSON-Array (kein Markdown):
[{"titel":"...","inhalt":"...","kategorie":"Markt","wichtig":false}]` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Kein JSON in Antwort');
      const items: { titel: string; inhalt: string; kategorie?: string; wichtig?: boolean }[] = JSON.parse(match[0]);
      const created = await Promise.all(items.map(n => prisma.news.create({ data: n })));
      return NextResponse.json({ ok: true, count: created.length });
    }

    // ---- SONDERBERICHT ----
    if (typ === 'sonderbericht') {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Erstelle einen detaillierten Sonderbericht zum Thema: ${thema || 'Aktueller Marktausblick'}.
Auf Deutsch, professionell, ca. 400-500 Wörter.
Antworte NUR mit JSON (kein Markdown): {"titel":"...","untertitel":"...","inhalt":"...","kategorie":"Analyse"}` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Kein JSON in Antwort');
      const data = JSON.parse(match[0]);
      const b = await prisma.sonderbericht.create({ data });
      return NextResponse.json(b);
    }

    // ---- ANALYSEN ----
    const targets = Array.isArray(symbols) && symbols.length
      ? ASSETS.filter(a => symbols.includes(a.symbol))
      : ASSETS;

    const tickers = targets.map(a => a.ticker).filter(Boolean);
    const preise = await getPreise(tickers);

    const results = [];
    for (const asset of targets) {
      const kurs = preise[asset.ticker] ?? null;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `Du bist ein erfahrener Finanzanalyst. Analysiere:
Instrument: ${asset.name} (${asset.symbol})
Markt: ${asset.markt}
Aktueller Kurs: ${kurs != null ? kurs.toLocaleString('de-DE') : 'nicht verfügbar'}

Erstelle eine präzise technische Analyse auf Deutsch.
Antworte NUR mit JSON (kein Markdown, keine Erklärungen außerhalb):
{
  "bias": "Bullisch",
  "kaufzoneMin": 123.45,
  "kaufzoneMax": 125.00,
  "zielzone1": 130.00,
  "zielzone2": 135.00,
  "stopp": 120.00,
  "einschaetzung": "2-3 Sätze technische Analyse hier.",
  "fazit": "Ein Satz Zusammenfassung."
}
Verwende null für nicht zutreffende Felder.` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      try {
        const json = JSON.parse(match[0]);
        const analyse = await prisma.analyse.create({
          data: {
            symbol: asset.symbol,
            name: asset.name,
            markt: asset.markt,
            ticker: asset.ticker,
            kurs: kurs ?? undefined,
            generiert: true,
            bias: json.bias ?? 'Neutral',
            kaufzoneMin: json.kaufzoneMin ?? null,
            kaufzoneMax: json.kaufzoneMax ?? null,
            zielzone1: json.zielzone1 ?? null,
            zielzone2: json.zielzone2 ?? null,
            stopp: json.stopp ?? null,
            einschaetzung: json.einschaetzung ?? '',
            fazit: json.fazit ?? '',
          },
        });
        results.push(analyse);
      } catch {
        continue;
      }
    }

    return NextResponse.json({ ok: true, count: results.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
