import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PromoType, PromoStatus } from '@prisma/client';

export async function GET() {
  try {
    // Check current count
    const existingCount = await prisma.promo.count();

    if (existingCount > 0) {
      return NextResponse.json({
        message: 'Promos already exist',
        count: existingCount
      });
    }

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

    const result = await prisma.promo.createMany({ data: promos });

    return NextResponse.json({
      success: true,
      created: result.count,
      promos: promos.map(p => p.title)
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({
      error: 'Failed to seed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
