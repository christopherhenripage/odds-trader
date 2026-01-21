'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PromoType, PromoStatus, CompletedPromoStatus, BookmakerStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// ============================================
// Promo Actions
// ============================================

export async function getActivePromos() {
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

  return promos;
}

export async function getPromosByBookmaker(bookmaker: string) {
  const promos = await prisma.promo.findMany({
    where: {
      bookmaker,
      status: 'ACTIVE',
    },
    orderBy: { estimatedValue: 'desc' },
  });

  return promos;
}

// Seed some initial promos (for demo/development)
export async function seedInitialPromos() {
  const existingPromos = await prisma.promo.count();
  if (existingPromos > 0) return { message: 'Promos already seeded' };

  const promos = [
    {
      bookmaker: 'sportsbet',
      bookmakerName: 'Sportsbet',
      title: 'Bet $50, Get $50 Bonus Bet',
      description: 'New customers only. Place a $50 bet on any market at odds $1.50 or greater.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 50,
      maxBonus: 50,
      estimatedValue: 38,
      minOdds: 1.5,
      featured: true,
      termsUrl: 'https://www.sportsbet.com.au/terms',
    },
    {
      bookmaker: 'ladbrokes',
      bookmakerName: 'Ladbrokes',
      title: 'Up to $100 Bonus Bets',
      description: 'Get bonus bets up to $100 when you sign up and deposit.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 100,
      maxBonus: 100,
      estimatedValue: 75,
      minOdds: 1.5,
      featured: true,
      termsUrl: 'https://www.ladbrokes.com.au/terms',
    },
    {
      bookmaker: 'neds',
      bookmakerName: 'Neds',
      title: 'Deposit Match up to $150',
      description: 'First deposit matched up to $150 in bonus bets.',
      type: 'DEPOSIT_MATCH' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 50,
      maxBonus: 150,
      estimatedValue: 110,
      minOdds: 1.5,
      featured: true,
      termsUrl: 'https://www.neds.com.au/terms',
    },
    {
      bookmaker: 'pointsbet',
      bookmakerName: 'PointsBet',
      title: '$100 in Bonus Bets',
      description: 'New customers receive $100 in bonus bets split across first week.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 50,
      maxBonus: 100,
      estimatedValue: 75,
      minOdds: 1.5,
      featured: false,
      termsUrl: 'https://www.pointsbet.com.au/terms',
    },
    {
      bookmaker: 'tab',
      bookmakerName: 'TAB',
      title: '$50 Bonus Bet',
      description: 'Sign up and get a $50 bonus bet when you place your first bet.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 20,
      maxBonus: 50,
      estimatedValue: 38,
      minOdds: 1.5,
      featured: false,
      termsUrl: 'https://www.tab.com.au/terms',
    },
    {
      bookmaker: 'bet365',
      bookmakerName: 'Bet365',
      title: 'Up to $100 in Bet Credits',
      description: 'Bet $1 and get up to $100 in bet credits for new customers.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 10,
      maxBonus: 100,
      estimatedValue: 75,
      minOdds: 1.2,
      featured: true,
      termsUrl: 'https://www.bet365.com.au/terms',
    },
    {
      bookmaker: 'unibet',
      bookmakerName: 'Unibet',
      title: 'First Bet Refund up to $50',
      description: 'If your first bet loses, get a refund up to $50 in bonus bets.',
      type: 'MONEY_BACK' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 20,
      maxBonus: 50,
      estimatedValue: 25,
      minOdds: 1.4,
      featured: false,
      termsUrl: 'https://www.unibet.com.au/terms',
    },
    {
      bookmaker: 'bluebet',
      bookmakerName: 'BlueBet',
      title: '$50 Bonus Bet',
      description: 'New customers get a $50 bonus bet on sign up.',
      type: 'SIGN_UP_BONUS' as PromoType,
      status: 'ACTIVE' as PromoStatus,
      minDeposit: 50,
      maxBonus: 50,
      estimatedValue: 38,
      minOdds: 1.5,
      featured: false,
      termsUrl: 'https://www.bluebet.com.au/terms',
    },
  ];

  await prisma.promo.createMany({ data: promos });
  revalidatePath('/dashboard');

  return { success: true, count: promos.length };
}

// ============================================
// Completed Promo Actions
// ============================================

export async function getCompletedPromos() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return [];

  const completed = await prisma.completedPromo.findMany({
    where: { userId: user.id },
    include: { promo: true },
    orderBy: { createdAt: 'desc' },
  });

  return completed;
}

export async function getPromoStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { totalProfit: 0, completedCount: 0, inProgressCount: 0, avgProfit: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return { totalProfit: 0, completedCount: 0, inProgressCount: 0, avgProfit: 0 };
  }

  const [completed, inProgress, profitSum] = await Promise.all([
    prisma.completedPromo.count({
      where: { userId: user.id, status: 'COMPLETED' },
    }),
    prisma.completedPromo.count({
      where: { userId: user.id, status: 'IN_PROGRESS' },
    }),
    prisma.completedPromo.aggregate({
      where: { userId: user.id, status: 'COMPLETED' },
      _sum: { profit: true },
    }),
  ]);

  const totalProfit = profitSum._sum.profit || 0;
  const avgProfit = completed > 0 ? totalProfit / completed : 0;

  return {
    totalProfit,
    completedCount: completed,
    inProgressCount: inProgress,
    avgProfit,
  };
}

export async function markPromoStarted(promoId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Not authenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { error: 'User not found' };

  const promo = await prisma.promo.findUnique({ where: { id: promoId } });
  if (!promo) return { error: 'Promo not found' };

  const completed = await prisma.completedPromo.create({
    data: {
      userId: user.id,
      promoId: promo.id,
      bookmaker: promo.bookmaker,
      promoTitle: promo.title,
      promoType: promo.type,
      status: 'IN_PROGRESS',
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/portfolio');

  return { success: true, id: completed.id };
}

export async function completePromo(
  completedPromoId: string,
  data: {
    qualifyingStake?: number;
    qualifyingLoss?: number;
    freeStake?: number;
    profit: number;
    notes?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Not authenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { error: 'User not found' };

  const updated = await prisma.completedPromo.update({
    where: { id: completedPromoId, userId: user.id },
    data: {
      ...data,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/portfolio');

  return { success: true, promo: updated };
}

export async function addManualPromo(data: {
  bookmaker: string;
  promoTitle: string;
  promoType: PromoType;
  qualifyingStake?: number;
  qualifyingLoss?: number;
  freeStake?: number;
  profit: number;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Not authenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { error: 'User not found' };

  const completed = await prisma.completedPromo.create({
    data: {
      userId: user.id,
      bookmaker: data.bookmaker,
      promoTitle: data.promoTitle,
      promoType: data.promoType,
      qualifyingStake: data.qualifyingStake,
      qualifyingLoss: data.qualifyingLoss,
      freeStake: data.freeStake,
      profit: data.profit,
      notes: data.notes,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/portfolio');

  return { success: true, promo: completed };
}

// ============================================
// Bookmaker Account Actions
// ============================================

export async function getBookmakerAccounts() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return [];

  const accounts = await prisma.bookmakerAccount.findMany({
    where: { userId: user.id },
    orderBy: { bookmakerName: 'asc' },
  });

  return accounts;
}

export async function addBookmakerAccount(data: {
  bookmaker: string;
  bookmakerName: string;
  status?: BookmakerStatus;
  signUpBonus?: boolean;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Not authenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { error: 'User not found' };

  const account = await prisma.bookmakerAccount.upsert({
    where: {
      userId_bookmaker: {
        userId: user.id,
        bookmaker: data.bookmaker,
      },
    },
    update: {
      status: data.status || 'ACTIVE',
      signUpBonus: data.signUpBonus || false,
      notes: data.notes,
    },
    create: {
      userId: user.id,
      bookmaker: data.bookmaker,
      bookmakerName: data.bookmakerName,
      status: data.status || 'ACTIVE',
      signUpBonus: data.signUpBonus || false,
      notes: data.notes,
    },
  });

  revalidatePath('/portfolio');

  return { success: true, account };
}

export async function updateBookmakerStatus(bookmaker: string, status: BookmakerStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Not authenticated' };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { error: 'User not found' };

  await prisma.bookmakerAccount.update({
    where: {
      userId_bookmaker: {
        userId: user.id,
        bookmaker,
      },
    },
    data: { status },
  });

  revalidatePath('/portfolio');

  return { success: true };
}
