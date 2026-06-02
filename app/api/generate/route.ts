import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ASSETS } from '@/app/lib/assets';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { symbols, typ } = await req.json();
  // typ: 'analyse' | 'news' | 'sonderbericht'

  try {
    if (typ === 'news') {
      // Markt-News generieren
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: `Erstelle 5 aktuelle Markt-News auf Deutsch (Stand heute).
Jede News: Titel + 2-3 Sätze Inhalt. Relevante Themen: Aktien, Indizes, Rohstoffe, Notenbanken, Konjunktur.
Antworte NUR mit JSON-Array:
[{"titel":"...","inhalt":"...","kategorie":"Markt|Rohstoffe|Krypto|Devisen","wichtig":false}]` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Kein JSON');
      const newsItems = JSON.parse(match[0]);
      const created = await Promise.all(newsItems.map((n: { titel: string; inhalt: string; kategorie?: string; wichtig?: boolean }) => prisma.news.create({ data: n })));
      return NextResponse.json({ ok: true, count: created.length });
    }

    if (typ === 'sonderbericht') {
      const { thema } = await req.json().catch(() => ({ thema: 'Marktausblick' }));
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: `Erstelle einen detaillierten Sonderbericht zum Thema: ${thema || 'Aktueller Marktausblick'}.
Auf Deutsch, professionell, ca. 400-500 Wörter.
Antworte NUR mit JSON: {"titel":"...","untertitel":"...","inhalt":"...","kategorie":"Analyse"}` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Kein JSON');
      const data = JSON.parse(match[0]);
      const b = await prisma.sonderbericht.create({ data });
      return NextResponse.json(b);
    }

    // Analysen für Assets generieren
    const targets = symbols?.length
      ? ASSETS.filter(a => symbols.includes(a.symbol))
      : ASSETS;

    // Live-Kurse holen
    const tickers = targets.map(a => a.ticker).filter(Boolean);
    const preisRes = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/preise?tickers=${tickers.join(',')}`);
    const preise: Record<string, { kurs: number }> = preisRes.ok ? await preisRes.json() : {};

    const results = [];
    for (const asset of targets) {
      const kurs = preise[asset.ticker]?.kurs ?? null;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `Du bist ein erfahrener Finanzanalyst. Analysiere:
Instrument: ${asset.name} (${asset.symbol})
Markt: ${asset.markt}
Aktueller Kurs: ${kurs ? kurs.toLocaleString('de-DE') : 'unbekannt'}

Erstelle eine technische Analyse auf Deutsch.
Antworte NUR mit JSON (keine Erklärungen):
{
  "bias": "Bullisch|Bärisch|Neutral",
  "kaufzoneMin": <Zahl oder null>,
  "kaufzoneMax": <Zahl oder null>,
  "zielzone1": <Zahl oder null>,
  "zielzone2": <Zahl oder null>,
  "stopp": <Zahl oder null>,
  "einschaetzung": "<2-3 Sätze technische Analyse>",
  "fazit": "<1 Satz kurze Zusammenfassung>"
}` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      const json = JSON.parse(match[0]);
      const analyse = await prisma.analyse.create({
        data: {
          symbol: asset.symbol,
          name: asset.name,
          markt: asset.markt,
          ticker: asset.ticker,
          kurs: kurs ?? undefined,
          generiert: true,
          ...json,
        },
      });
      results.push(analyse);
    }

    return NextResponse.json({ ok: true, count: results.length, analysen: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
