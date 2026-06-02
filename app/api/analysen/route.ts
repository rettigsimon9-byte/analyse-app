import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const markt = req.nextUrl.searchParams.get('markt');
  const analysen = await prisma.analyse.findMany({
    where: markt && markt !== 'Alle' ? { markt } : undefined,
    orderBy: { datum: 'desc' },
    take: 100,
  });
  return NextResponse.json(analysen);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const analyse = await prisma.analyse.create({ data });
  return NextResponse.json(analyse);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.analyse.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
