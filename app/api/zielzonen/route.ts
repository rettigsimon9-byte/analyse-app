import { prisma } from '@/app/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const nurAktiv = req.nextUrl.searchParams.get('aktiv') !== 'false';
  const zielzonen = await prisma.zielzone.findMany({
    where: nurAktiv ? { aktiv: true } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(zielzonen);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const zz = await prisma.zielzone.create({ data });
  return NextResponse.json(zz);
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json();
  const zz = await prisma.zielzone.update({ where: { id }, data });
  return NextResponse.json(zz);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.zielzone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
