import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ASSETS } from '@/app/lib/assets';
import { fetchTechnicalData, formatTechnicalContext } from '@/app/lib/technicalAnalysis';

const client = new Anthropic();

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

    const results = [];
    for (const asset of targets) {
      // Echte technische Daten fetchen (200 Tage OHLCV + Indikatoren)
      const td = await fetchTechnicalData(asset.ticker, asset.symbol, asset.name);
      const technicalContext = formatTechnicalContext(td);
      const kurs = td.kurs;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `Du bist ein erfahrener technischer Analyst. Analysiere das folgende Instrument auf Basis der ECHTEN Marktdaten.

${technicalContext}

Erstelle eine fundierte technische Analyse. Leite Kaufzonen aus echten Support-Levels/MAs ab, Zielzonen aus echten Widerstandsniveaus/Hochs.

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text außerhalb):
{"bias":"Bullisch","kaufzoneMin":100.0,"kaufzoneMax":105.0,"zielzone1":115.0,"zielzone2":125.0,"stopp":95.0,"einschaetzung":"Technische Einschätzung in 2-3 Sätzen basierend auf den Indikatoren.","fazit":"Konkreter Ausblick in einem Satz."}

Regeln:
- bias: "Bullisch", "Bärisch" oder "Neutral" — basierend auf Trend und RSI
- Kaufzone: nahe an Support-Levels, MAs oder 30/90-Tage-Tiefs
- Zielzone: nahe an Widerständen, 30/90-Tage-Hochs
- Stopp: unter wichtigem Support oder 30-Tage-Tief
- Alle Preiswerte als Zahlen, auf aktuelle Größenordnung abgestimmt
- einschaetzung: konkret auf die echten Indikatoren eingehen (MA, RSI, Levels)
- IMMER vollständige Analyse liefern` }] });

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
            kurs: td.kurs ?? undefined,
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

        // Zielzone automatisch speichern wenn alle Pflichtfelder vorhanden
        if (
          json.kaufzoneMin != null && json.kaufzoneMax != null &&
          json.zielzone1 != null && json.stopp != null
        ) {
          await prisma.zielzone.create({
            data: {
              symbol: asset.symbol,
              name: asset.name,
              markt: asset.markt,
              ticker: asset.ticker,
              kurs: td.kurs ?? undefined,
              einstiegMin: json.kaufzoneMin,
              einstiegMax: json.kaufzoneMax,
              ziel1: json.zielzone1,
              ziel2: json.zielzone2 ?? null,
              stopp: json.stopp,
              status: 'Auf dem Weg',
              aktiv: true,
            },
          });
        }

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
