import { NextResponse } from 'next/server';

// Hilfreich um die Chat-ID des Bots herauszufinden
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN nicht gesetzt' });

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1`);
    const data = await res.json();

    if (!data.ok) return NextResponse.json({ error: 'Token ungültig', detail: data });

    const updates = data.result ?? [];
    if (updates.length === 0) {
      return NextResponse.json({
        info: 'Noch keine Nachricht empfangen. Schreibe deinem Bot in Telegram und lade diese Seite neu.',
        url: `Telegram: t.me/${token.split(':')[0]}`,
      });
    }

    const chatId = updates[updates.length - 1]?.message?.chat?.id
      ?? updates[updates.length - 1]?.channel_post?.chat?.id;

    return NextResponse.json({
      chatId,
      info: `Chat-ID gefunden: ${chatId} — trage diese in Railway als TELEGRAM_CHAT_ID ein`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
