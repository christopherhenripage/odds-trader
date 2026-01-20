import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const market = searchParams.get('market');
    const type = searchParams.get('type');
    const minEdge = Number(searchParams.get('minEdge')) || 0;
    const minWidth = Number(searchParams.get('minWidth')) || 0;

    const where: Record<string, unknown> = {
      edgePct: { gte: minEdge },
    };

    if (sport && sport !== 'all') {
      where.sportKey = sport;
    }

    if (market && market !== 'all') {
      where.marketKey = market;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (minWidth > 0) {
      where.middleWidth = { gte: minWidth };
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
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
