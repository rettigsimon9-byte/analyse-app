import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const news = await prisma.news.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return NextResponse.json(news);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.news.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
