import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const depot = req.nextUrl.searchParams.get('depot');
  const positionen = await prisma.position.findMany({
    where: depot ? { depot } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(positionen);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const pos = await prisma.position.create({ data });
  return NextResponse.json(pos);
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  const pos = await prisma.position.update({ where: { id }, data });
  return NextResponse.json(pos);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.position.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
