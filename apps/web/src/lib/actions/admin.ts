'use server';

import { prisma } from '@/lib/prisma';

export async function getLatestHeartbeat() {
  const heartbeat = await prisma.workerHeartbeat.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  return heartbeat;
}

export async function getHeartbeatHistory(limit: number = 20) {
  const heartbeats = await prisma.workerHeartbeat.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return heartbeats;
}

export async function getSystemStats() {
  const [
    totalOpportunities,
    todayOpportunities,
    totalDeliveries,
    failedDeliveries,
    totalUsers,
    activeUsers,
  ] = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.opportunityDelivery.count(),
    prisma.opportunityDelivery.count({ where: { status: 'FAILED' } }),
    prisma.user.count(),
    prisma.notificationSetting.count({
      where: { channel: { not: 'NONE' } },
    }),
  ]);

  return {
    totalOpportunities,
    todayOpportunities,
    totalDeliveries,
    failedDeliveries,
    deliverySuccessRate:
      totalDeliveries > 0
        ? ((totalDeliveries - failedDeliveries) / totalDeliveries) * 100
        : 100,
    totalUsers,
    activeUsers,
  };
}

export async function getRecentDeliveries(limit: number = 20) {
  const deliveries = await prisma.opportunityDelivery.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      opportunity: {
        select: {
          type: true,
          homeTeam: true,
          awayTeam: true,
          edgePct: true,
        },
      },
      user: {
        select: { email: true },
      },
    },
  });

  return deliveries;
}
