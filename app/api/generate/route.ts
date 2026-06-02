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

WICHTIGE LOGIK-REGELN (PFLICHT):
- Kaufzone: MUSS unter dem aktuellen Kurs (${kurs ?? 'unbekannt'}) liegen — wir kaufen bei einem Rücklauf zu Support, NICHT über dem aktuellen Preis
- Zielzone: MUSS über dem aktuellen Kurs liegen — das ist unser Kursziel
- Stopp: MUSS unter der Kaufzone liegen — das ist unsere Verlustbegrenzung
- Reihenfolge zwingend: Stopp < KaufzoneMin < KaufzoneMax < AktuellerKurs < Zielzone1

Antworte AUSSCHLIESSLICH mit gültigem JSON:
{"bias":"Bullisch","kaufzoneMin":100.0,"kaufzoneMax":105.0,"zielzone1":120.0,"zielzone2":130.0,"stopp":95.0,"einschaetzung":"2-3 Sätze mit konkretem Bezug auf MA, RSI und Key-Levels.","fazit":"1 Satz Ausblick."}

Weitere Regeln:
- bias basierend auf Trend (MA-Lage) und RSI
- Kaufzone: an MA50/MA200 oder 30/90-Tage-Tief orientieren
- Zielzone: an 30/90-Tage-Hoch oder nächstem Widerstand orientieren
- Stopp: unter 30-Tage-Tief oder letztem Swing-Low
- Alle Werte als Zahlen, passend zur Größenordnung des Assets` }] });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      try {
        const json = JSON.parse(match[0]);

        // ---- Zonen-Validierung ----
        // Kaufzone muss unter dem aktuellen Kurs liegen
        // Zielzone muss über dem aktuellen Kurs liegen
        if (kurs != null) {
          // Kaufzone über Kurs → an MA50 oder 30-Tage-Tief anpassen
          if (json.kaufzoneMax != null && json.kaufzoneMax > kurs * 0.99) {
            const anchor = td.ma50 ?? td.tief30 ?? kurs * 0.95;
            const spread = kurs * 0.02; // 2% Spanne
            json.kaufzoneMax = Math.round(anchor * 100) / 100;
            json.kaufzoneMin = Math.round((anchor - spread) * 100) / 100;
          }
          // Zielzone unter Kurs → an 30-Tage-Hoch anpassen
          if (json.zielzone1 != null && json.zielzone1 < kurs * 1.01) {
            json.zielzone1 = Math.round((td.hoch30 ?? kurs * 1.08) * 100) / 100;
            if (json.zielzone2 != null && json.zielzone2 <= json.zielzone1) {
              json.zielzone2 = Math.round((td.hoch90 ?? json.zielzone1 * 1.05) * 100) / 100;
            }
          }
          // Stopp über Kaufzone → korrigieren
          if (json.stopp != null && json.kaufzoneMin != null && json.stopp >= json.kaufzoneMin) {
            json.stopp = Math.round(json.kaufzoneMin * 0.97 * 100) / 100;
          }
        }

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
