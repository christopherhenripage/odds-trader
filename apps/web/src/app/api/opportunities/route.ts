import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Disable caching for this route - data changes frequently
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        ...opp,
        legs: opp.legs as unknown as Array<{
          outcome: string;
          bookmaker: string;
          bookmakerTitle: string;
          odds: number;
          point?: number;
          stake?: number;
        }>,
      })),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 });
  }
}
