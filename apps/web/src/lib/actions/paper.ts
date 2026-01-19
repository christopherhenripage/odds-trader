'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaperPositionStatus } from '@prisma/client';

export interface PaperAccountSettings {
  bankroll: number;
  maxOpen: number;
  enabled: boolean;
  autoFill: boolean;
  latencyMsMin: number;
  latencyMsMax: number;
  slippageBps: number;
  missFillProb: number;
  maxLegOddsWorsen: number;
  fillEvenIfEdgeLost: boolean;
}

export async function getPaperAccount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  let account = await prisma.paperAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!account) {
    // Create default account
    account = await prisma.paperAccount.create({
      data: {
        userId: session.user.id,
        bankroll: 1000,
        maxOpen: 5,
        enabled: false,
        autoFill: false,
        latencyMsMin: 400,
        latencyMsMax: 2200,
        slippageBps: 35,
        missFillProb: 0.08,
        maxLegOddsWorsen: 0.15,
        fillEvenIfEdgeLost: false,
      },
    });
  }

  return account;
}

export async function updatePaperAccount(data: Partial<PaperAccountSettings>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.paperAccount.upsert({
    where: { userId: session.user.id },
    update: data,
    create: {
      userId: session.user.id,
      bankroll: data.bankroll ?? 1000,
      maxOpen: data.maxOpen ?? 5,
      enabled: data.enabled ?? false,
      autoFill: data.autoFill ?? false,
      latencyMsMin: data.latencyMsMin ?? 400,
      latencyMsMax: data.latencyMsMax ?? 2200,
      slippageBps: data.slippageBps ?? 35,
      missFillProb: data.missFillProb ?? 0.08,
      maxLegOddsWorsen: data.maxLegOddsWorsen ?? 0.15,
      fillEvenIfEdgeLost: data.fillEvenIfEdgeLost ?? false,
    },
  });

  return account;
}

export async function getPaperPositions(status?: PaperPositionStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status) {
    where.status = status;
  }

  const positions = await prisma.paperPosition.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return positions.map((pos) => ({
    ...pos,
    legs: pos.legs as unknown as Array<{
      outcome: string;
      bookmaker: string;
      bookmakerTitle: string;
      odds: number;
      point?: number;
      stake?: number;
    }>,
    slippageApplied: pos.slippageApplied as number[] | null,
  }));
}

export async function getOpenPositionCount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return prisma.paperPosition.count({
    where: {
      userId: session.user.id,
      status: 'OPEN',
    },
  });
}

export async function closePosition(positionId: string, payout: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const position = await prisma.paperPosition.findFirst({
    where: {
      id: positionId,
      userId: session.user.id,
      status: 'OPEN',
    },
  });

  if (!position) {
    throw new Error('Position not found or already closed');
  }

  // Update position
  const updatedPosition = await prisma.paperPosition.update({
    where: { id: positionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      payout,
    },
  });

  // Update bankroll
  await prisma.paperAccount.update({
    where: { userId: session.user.id },
    data: {
      bankroll: { increment: payout },
    },
  });

  return updatedPosition;
}

export async function resetPaperAccount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Close all open positions as missed
  await prisma.paperPosition.updateMany({
    where: {
      userId: session.user.id,
      status: 'OPEN',
    },
    data: {
      status: 'MISSED',
      closedAt: new Date(),
      notes: 'Account reset',
    },
  });

  // Reset bankroll
  const account = await prisma.paperAccount.update({
    where: { userId: session.user.id },
    data: {
      bankroll: 1000,
    },
  });

  return account;
}

export async function getPaperStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const [account, totalPositions, openPositions, closedPositions] = await Promise.all([
    prisma.paperAccount.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.paperPosition.count({
      where: { userId: session.user.id },
    }),
    prisma.paperPosition.count({
      where: { userId: session.user.id, status: 'OPEN' },
    }),
    prisma.paperPosition.findMany({
      where: { userId: session.user.id, status: 'CLOSED' },
      select: { stakeTotal: true, payout: true },
    }),
  ]);

  const totalInvested = closedPositions.reduce((sum, p) => sum + p.stakeTotal, 0);
  const totalPayout = closedPositions.reduce((sum, p) => sum + (p.payout || 0), 0);
  const totalProfit = totalPayout - totalInvested;
  const winRate = closedPositions.length > 0
    ? closedPositions.filter((p) => (p.payout || 0) > p.stakeTotal).length / closedPositions.length
    : 0;

  return {
    bankroll: account?.bankroll || 1000,
    totalPositions,
    openPositions,
    closedPositions: closedPositions.length,
    totalInvested,
    totalPayout,
    totalProfit,
    winRate,
    roi: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
  };
}
