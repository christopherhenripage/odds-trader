import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.opportunity.count();
    const sample = await prisma.opportunity.findFirst({
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        type: true,
        edgePct: true,
      },
    });

    return NextResponse.json({
      status: 'ok',
      count,
      sample,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: String(error),
    }, { status: 500 });
  }
}
