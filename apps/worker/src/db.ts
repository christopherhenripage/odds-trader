import { PrismaClient, Prisma } from '@prisma/client';
import { Opportunity, HeartbeatData, NotificationChannel } from '@odds-trader/shared';

const prisma = new PrismaClient();

export async function upsertOpportunity(opp: Opportunity): Promise<string> {
  const result = await prisma.opportunity.upsert({
    where: { fingerprint: opp.fingerprint },
    update: {
      edgePct: opp.edgePct,
      middleWidth: opp.middleWidth,
      legs: opp.legs as unknown as Prisma.InputJsonValue,
    },
    create: {
      fingerprint: opp.fingerprint,
      eventId: opp.eventId,
      sportKey: opp.sportKey,
      sportTitle: opp.sportTitle,
      commenceTime: opp.commenceTime,
      homeTeam: opp.homeTeam,
      awayTeam: opp.awayTeam,
      type: opp.type,
      marketKey: opp.marketKey,
      edgePct: opp.edgePct,
      middleWidth: opp.middleWidth,
      legs: opp.legs as unknown as Prisma.InputJsonValue,
    },
  });

  return result.id;
}

export async function opportunityExists(fingerprint: string): Promise<boolean> {
  const count = await prisma.opportunity.count({
    where: { fingerprint },
  });
  return count > 0;
}

export interface UserNotificationSettings {
  userId: string;
  channel: NotificationChannel;
  discordWebhook: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  emailTo: string | null;
}

export async function getUsersWithNotifications(): Promise<UserNotificationSettings[]> {
  const settings = await prisma.notificationSetting.findMany({
    where: {
      channel: { not: 'NONE' },
    },
  });

  return settings.map((s) => ({
    userId: s.userId,
    channel: s.channel as NotificationChannel,
    discordWebhook: s.discordWebhook,
    telegramBotToken: s.telegramBotToken,
    telegramChatId: s.telegramChatId,
    emailTo: s.emailTo,
  }));
}

export async function recordDelivery(
  opportunityId: string,
  userId: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  channel: NotificationChannel,
  error?: string
): Promise<void> {
  await prisma.opportunityDelivery.create({
    data: {
      opportunityId,
      userId,
      status,
      channel,
      error,
    },
  });
}

export async function hasDelivered(
  opportunityId: string,
  userId: string
): Promise<boolean> {
  const count = await prisma.opportunityDelivery.count({
    where: {
      opportunityId,
      userId,
      status: 'SENT',
    },
  });
  return count > 0;
}

export async function updateHeartbeat(data: HeartbeatData): Promise<void> {
  await prisma.workerHeartbeat.create({
    data: {
      lastScanAt: data.lastScanAt,
      polls: data.polls,
      lastError: data.lastError,
      apiCalls: data.apiCalls,
    },
  });

  // Cleanup old heartbeats (keep last 100)
  const heartbeats = await prisma.workerHeartbeat.findMany({
    orderBy: { createdAt: 'desc' },
    skip: 100,
    select: { id: true },
  });

  if (heartbeats.length > 0) {
    await prisma.workerHeartbeat.deleteMany({
      where: {
        id: { in: heartbeats.map((h) => h.id) },
      },
    });
  }
}

export interface PaperAccountWithSettings {
  userId: string;
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

export async function getPaperAccountsWithAutoFill(): Promise<PaperAccountWithSettings[]> {
  const accounts = await prisma.paperAccount.findMany({
    where: {
      enabled: true,
      autoFill: true,
    },
  });

  return accounts;
}

export async function getOpenPaperPositionCount(userId: string): Promise<number> {
  return prisma.paperPosition.count({
    where: {
      userId,
      status: 'OPEN',
    },
  });
}

export async function createPaperPosition(data: {
  userId: string;
  type: 'ARB' | 'MIDDLE';
  eventId: string;
  summary: string;
  stakeTotal: number;
  edgePct: number;
  status: 'OPEN' | 'MISSED' | 'EDGE_LOST';
  legs: unknown[];
  latencyMs: number;
  slippageApplied: number[];
}): Promise<void> {
  await prisma.paperPosition.create({
    data: {
      userId: data.userId,
      type: data.type,
      eventId: data.eventId,
      summary: data.summary,
      stakeTotal: data.stakeTotal,
      edgePct: data.edgePct,
      status: data.status,
      legs: data.legs as unknown as Prisma.InputJsonValue,
      latencyMs: data.latencyMs,
      slippageApplied: data.slippageApplied as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function debitBankroll(userId: string, amount: number): Promise<void> {
  await prisma.paperAccount.update({
    where: { userId },
    data: {
      bankroll: { decrement: amount },
    },
  });
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
