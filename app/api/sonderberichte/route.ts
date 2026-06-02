import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const berichte = await prisma.sonderbericht.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(berichte);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const b = await prisma.sonderbericht.create({ data });
  return NextResponse.json(b);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.sonderbericht.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
