import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sportsbooks = [
  { key: 'draftkings', title: 'DraftKings' },
  { key: 'fanduel', title: 'FanDuel' },
  { key: 'betmgm', title: 'BetMGM' },
  { key: 'caesars', title: 'Caesars' },
  { key: 'pointsbet', title: 'PointsBet' },
  { key: 'bet365', title: 'Bet365' },
];

const games = [
  { sport: 'basketball_nba', title: 'NBA', home: 'Los Angeles Lakers', away: 'Boston Celtics' },
  { sport: 'basketball_nba', title: 'NBA', home: 'Golden State Warriors', away: 'Phoenix Suns' },
  { sport: 'basketball_nba', title: 'NBA', home: 'Milwaukee Bucks', away: 'Miami Heat' },
  { sport: 'americanfootball_nfl', title: 'NFL', home: 'Kansas City Chiefs', away: 'Buffalo Bills' },
  { sport: 'americanfootball_nfl', title: 'NFL', home: 'San Francisco 49ers', away: 'Dallas Cowboys' },
  { sport: 'icehockey_nhl', title: 'NHL', home: 'Vegas Golden Knights', away: 'Colorado Avalanche' },
  { sport: 'baseball_mlb', title: 'MLB', home: 'New York Yankees', away: 'Los Angeles Dodgers' },
  { sport: 'soccer_epl', title: 'EPL', home: 'Manchester United', away: 'Liverpool' },
  { sport: 'soccer_epl', title: 'EPL', home: 'Arsenal', away: 'Manchester City' },
  { sport: 'basketball_ncaab', title: 'NCAAB', home: 'Duke Blue Devils', away: 'North Carolina Tar Heels' },
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max));
}

function generateFingerprint(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateArb(game: typeof games[0], minutesAgo: number) {
  const book1 = sportsbooks[randomInt(0, 3)];
  const book2 = sportsbooks[randomInt(3, 6)];
  const edgePct = randomBetween(0.8, 3.5);

  const odds1 = randomBetween(1.9, 2.3);
  const odds2 = randomBetween(1.9, 2.3);

  const stake = 100;
  const stake1 = stake * (odds2 / (odds1 + odds2));
  const stake2 = stake - stake1;

  return {
    fingerprint: generateFingerprint(),
    createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
    eventId: `event_${game.sport}_${game.home.replace(/\s/g, '_').toLowerCase()}`,
    sportKey: game.sport,
    sportTitle: game.title,
    commenceTime: new Date(Date.now() + randomInt(1, 48) * 60 * 60 * 1000),
    homeTeam: game.home,
    awayTeam: game.away,
    type: 'ARB' as const,
    marketKey: 'h2h',
    edgePct: Math.round(edgePct * 100) / 100,
    middleWidth: null,
    legs: [
      {
        outcome: game.home,
        bookmaker: book1.key,
        bookmakerTitle: book1.title,
        odds: Math.round(odds1 * 100) / 100,
        stake: Math.round(stake1 * 100) / 100,
      },
      {
        outcome: game.away,
        bookmaker: book2.key,
        bookmakerTitle: book2.title,
        odds: Math.round(odds2 * 100) / 100,
        stake: Math.round(stake2 * 100) / 100,
      },
    ],
  };
}

function generateMiddle(game: typeof games[0], minutesAgo: number) {
  const book1 = sportsbooks[randomInt(0, 3)];
  const book2 = sportsbooks[randomInt(3, 6)];

  const isTotal = Math.random() > 0.5;
  const marketKey = isTotal ? 'totals' : 'spreads';

  let point1: number, point2: number;
  if (isTotal) {
    const baseTotal = randomBetween(200, 230);
    point1 = Math.round(baseTotal * 2) / 2;
    point2 = point1 + randomBetween(1, 4);
  } else {
    const baseSpread = randomBetween(-8, 8);
    point1 = Math.round(baseSpread * 2) / 2;
    point2 = point1 + randomBetween(1.5, 5);
  }

  const middleWidth = Math.round((point2 - point1) * 10) / 10;
  const edgePct = randomBetween(0.5, 2.0);

  const odds1 = randomBetween(-115, -105) / 100 + 2;
  const odds2 = randomBetween(-115, -105) / 100 + 2;

  return {
    fingerprint: generateFingerprint(),
    createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
    eventId: `event_${game.sport}_${game.home.replace(/\s/g, '_').toLowerCase()}`,
    sportKey: game.sport,
    sportTitle: game.title,
    commenceTime: new Date(Date.now() + randomInt(1, 48) * 60 * 60 * 1000),
    homeTeam: game.home,
    awayTeam: game.away,
    type: 'MIDDLE' as const,
    marketKey,
    edgePct: Math.round(edgePct * 100) / 100,
    middleWidth,
    legs: isTotal ? [
      {
        outcome: 'Over',
        bookmaker: book1.key,
        bookmakerTitle: book1.title,
        odds: Math.round(odds1 * 100) / 100,
        point: point1,
        stake: 50,
      },
      {
        outcome: 'Under',
        bookmaker: book2.key,
        bookmakerTitle: book2.title,
        odds: Math.round(odds2 * 100) / 100,
        point: point2,
        stake: 50,
      },
    ] : [
      {
        outcome: game.home,
        bookmaker: book1.key,
        bookmakerTitle: book1.title,
        odds: Math.round(odds1 * 100) / 100,
        point: point1,
        stake: 50,
      },
      {
        outcome: game.away,
        bookmaker: book2.key,
        bookmakerTitle: book2.title,
        odds: Math.round(odds2 * 100) / 100,
        point: -point2,
        stake: 50,
      },
    ],
  };
}

async function main() {
  console.log('Clearing old opportunities...');
  await prisma.opportunity.deleteMany({});

  console.log('Generating mock opportunities...');

  const opportunities = [];

  // Generate opportunities with varying timestamps (most recent first)
  for (let i = 0; i < 15; i++) {
    const game = games[randomInt(0, games.length)];
    const minutesAgo = randomInt(1, 30); // Last 30 minutes
    opportunities.push(generateArb(game, minutesAgo));
  }

  for (let i = 0; i < 25; i++) {
    const game = games[randomInt(0, games.length)];
    const minutesAgo = randomInt(1, 60); // Last hour
    opportunities.push(generateMiddle(game, minutesAgo));
  }

  // Add some older ones too
  for (let i = 0; i < 10; i++) {
    const game = games[randomInt(0, games.length)];
    const minutesAgo = randomInt(60, 24 * 60); // Last 24 hours
    opportunities.push(Math.random() > 0.3 ? generateMiddle(game, minutesAgo) : generateArb(game, minutesAgo));
  }

  console.log(`Inserting ${opportunities.length} opportunities...`);

  for (const opp of opportunities) {
    await prisma.opportunity.create({ data: opp });
  }

  console.log('Done! Mock data seeded successfully.');

  const stats = await prisma.opportunity.groupBy({
    by: ['type'],
    _count: true,
  });
  console.log('Stats:', stats);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
