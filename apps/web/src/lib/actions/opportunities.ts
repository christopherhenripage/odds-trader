'use server';

import { prisma } from '@/lib/prisma';
import { OpportunityType } from '@prisma/client';

export interface OpportunityFilter {
  sport?: string;
  market?: string;
  type?: OpportunityType | 'all';
  minEdge?: number;
  minWidth?: number;
  limit?: number;
}

export async function getOpportunities(filter: OpportunityFilter = {}) {
  const {
    sport,
    market,
    type,
    minEdge = 0,
    minWidth = 0,
    limit = 50,
  } = filter;

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
    take: limit,
  });

  return opportunities.map((opp) => ({
    ...opp,
    legs: opp.legs as unknown as Array<{
      outcome: string;
      bookmaker: string;
      bookmakerTitle: string;
      odds: number;
      point?: number;
      stake?: number;
    }>,
  }));
}

export async function getOpportunityById(id: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
  });

  if (!opportunity) return null;

  return {
    ...opportunity,
    legs: opportunity.legs as unknown as Array<{
      outcome: string;
      bookmaker: string;
      bookmakerTitle: string;
      odds: number;
      point?: number;
      stake?: number;
    }>,
  };
}

export async function getUniqueSports() {
  const sports = await prisma.opportunity.findMany({
    select: { sportKey: true },
    distinct: ['sportKey'],
  });

  return sports.map((s) => s.sportKey);
}

export async function getOpportunityStats() {
  const [total, arbs, middles, recentCount] = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { type: 'ARB' } }),
    prisma.opportunity.count({ where: { type: 'MIDDLE' } }),
    prisma.opportunity.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const avgEdge = await prisma.opportunity.aggregate({
    _avg: { edgePct: true },
  });

  return {
    total,
    arbs,
    middles,
    recentCount,
    avgEdge: avgEdge._avg.edgePct || 0,
  };
}
