import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        edgePct: { gte: 0 },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      count: opportunities.length,
      opportunities: opportunities.map(opp => ({
        id: opp.id,
        homeTeam: opp.homeTeam,
        awayTeam: opp.awayTeam,
        type: opp.type,
        edgePct: opp.edgePct,
        marketKey: opp.marketKey,
        legs: opp.legs,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 });
  }
}
