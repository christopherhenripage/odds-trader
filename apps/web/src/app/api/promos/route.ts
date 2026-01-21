import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promos = await prisma.promo.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: [
        { featured: 'desc' },
        { estimatedValue: 'desc' },
        { sortOrder: 'asc' },
      ],
    });

    return NextResponse.json({
      count: promos.length,
      promos: promos.map(p => ({
        id: p.id,
        bookmaker: p.bookmakerName,
        title: p.title,
        estimatedValue: p.estimatedValue,
        featured: p.featured,
        status: p.status,
      }))
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch promos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
