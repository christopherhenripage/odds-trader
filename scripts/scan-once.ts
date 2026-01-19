import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const SPORTS_TO_SCAN = [
  'basketball_nba',
  'icehockey_nhl',
];

const MARKETS = ['h2h', 'spreads', 'totals'];
const API_KEY = process.env.ODDS_API_KEY || '08ac8d4604a82632f9758b002f6efc3a';
const API_BASE = 'https://api.the-odds-api.com/v4';

if (!process.env.ODDS_API_KEY) {
  console.log('⚠️  No ODDS_API_KEY in environment, using default key');
}
const MIN_EDGE = 0.3;
const MIN_MIDDLE_WIDTH = 0.5;

interface Outcome {
  name: string;
  price: number;
  point?: number;
}

interface Market {
  key: string;
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface Event {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface Leg {
  outcome: string;
  bookmaker: string;
  bookmakerTitle: string;
  odds: number;
  point?: number;
  stake?: number;
}

interface Opportunity {
  eventId: string;
  sportKey: string;
  sportTitle: string | null;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  type: 'ARB' | 'MIDDLE';
  marketKey: string;
  edgePct: number;
  middleWidth: number | null;
  legs: Leg[];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOdds(sportKey: string): Promise<Event[]> {
  const url = `${API_BASE}/sports/${sportKey}/odds?apiKey=${API_KEY}&regions=us&markets=${MARKETS.join(',')}&oddsFormat=decimal`;

  // Add delay to avoid rate limiting
  await sleep(3000);

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const remaining = response.headers.get('x-requests-remaining');
  console.log(`  API credits remaining: ${remaining}`);

  return response.json();
}

function detectArbitrages(event: Event): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // For h2h market, check for arbitrage across bookmakers
  const h2hBooks: Map<string, { bookmaker: Bookmaker; outcomes: Map<string, Outcome> }> = new Map();

  for (const bm of event.bookmakers) {
    const h2hMarket = bm.markets.find(m => m.key === 'h2h');
    if (!h2hMarket) continue;

    const outcomes = new Map<string, Outcome>();
    for (const o of h2hMarket.outcomes) {
      outcomes.set(o.name, o);
    }
    h2hBooks.set(bm.key, { bookmaker: bm, outcomes });
  }

  // Check all pairs of bookmakers
  const bookKeys = Array.from(h2hBooks.keys());

  for (let i = 0; i < bookKeys.length; i++) {
    for (let j = i + 1; j < bookKeys.length; j++) {
      const book1 = h2hBooks.get(bookKeys[i])!;
      const book2 = h2hBooks.get(bookKeys[j])!;

      // Get best odds for each outcome across both books
      const team1 = event.home_team;
      const team2 = event.away_team;

      const odds1_book1 = book1.outcomes.get(team1)?.price || 0;
      const odds1_book2 = book2.outcomes.get(team1)?.price || 0;
      const odds2_book1 = book1.outcomes.get(team2)?.price || 0;
      const odds2_book2 = book2.outcomes.get(team2)?.price || 0;

      // Best odds for each team
      const best1 = Math.max(odds1_book1, odds1_book2);
      const best2 = Math.max(odds2_book1, odds2_book2);
      const best1Book = odds1_book1 >= odds1_book2 ? book1 : book2;
      const best2Book = odds2_book1 >= odds2_book2 ? book1 : book2;

      if (best1 > 0 && best2 > 0) {
        // Check for arbitrage: 1/odds1 + 1/odds2 < 1
        const impliedProb = (1 / best1) + (1 / best2);

        if (impliedProb < 1) {
          const edgePct = ((1 / impliedProb) - 1) * 100;

          if (edgePct >= MIN_EDGE) {
            const totalStake = 100;
            const stake1 = totalStake * (1 / best1) / impliedProb;
            const stake2 = totalStake * (1 / best2) / impliedProb;

            opportunities.push({
              eventId: event.id,
              sportKey: event.sport_key,
              sportTitle: event.sport_title,
              commenceTime: new Date(event.commence_time),
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              type: 'ARB',
              marketKey: 'h2h',
              edgePct: Math.round(edgePct * 100) / 100,
              middleWidth: null,
              legs: [
                {
                  outcome: team1,
                  bookmaker: best1Book.bookmaker.key,
                  bookmakerTitle: best1Book.bookmaker.title,
                  odds: best1,
                  stake: Math.round(stake1 * 100) / 100,
                },
                {
                  outcome: team2,
                  bookmaker: best2Book.bookmaker.key,
                  bookmakerTitle: best2Book.bookmaker.title,
                  odds: best2,
                  stake: Math.round(stake2 * 100) / 100,
                },
              ],
            });
          }
        }
      }
    }
  }

  return opportunities;
}

function detectMiddles(event: Event): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Check spreads for middles
  const spreadBooks: Map<string, { bookmaker: Bookmaker; outcomes: Outcome[] }> = new Map();

  for (const bm of event.bookmakers) {
    const spreadMarket = bm.markets.find(m => m.key === 'spreads');
    if (!spreadMarket) continue;
    spreadBooks.set(bm.key, { bookmaker: bm, outcomes: spreadMarket.outcomes });
  }

  // Check all pairs for middle opportunities
  const bookKeys = Array.from(spreadBooks.keys());

  for (let i = 0; i < bookKeys.length; i++) {
    for (let j = i + 1; j < bookKeys.length; j++) {
      const book1 = spreadBooks.get(bookKeys[i])!;
      const book2 = spreadBooks.get(bookKeys[j])!;

      // Find home team spread in each book
      const home1 = book1.outcomes.find(o => o.name === event.home_team);
      const home2 = book2.outcomes.find(o => o.name === event.home_team);
      const away1 = book1.outcomes.find(o => o.name === event.away_team);
      const away2 = book2.outcomes.find(o => o.name === event.away_team);

      if (!home1?.point || !home2?.point || !away1?.point || !away2?.point) continue;

      // Middle exists when: book1 home spread < book2 away spread (or vice versa)
      // e.g., Home -3.5 at book1, Away +7 at book2 = middle of 3.5 points
      const middleWidth = Math.abs(home1.point) < Math.abs(away2.point)
        ? Math.abs(away2.point) - Math.abs(home1.point)
        : Math.abs(away1.point) - Math.abs(home2.point);

      if (middleWidth >= MIN_MIDDLE_WIDTH) {
        // Calculate edge (simplified - assumes equal juice)
        const impliedProb = (1 / home1.price) + (1 / away2.price);
        const edgePct = Math.max(0, ((1 / impliedProb) - 1) * 100);

        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'spreads',
          edgePct: Math.round(edgePct * 100) / 100,
          middleWidth: Math.round(middleWidth * 10) / 10,
          legs: [
            {
              outcome: event.home_team,
              bookmaker: book1.bookmaker.key,
              bookmakerTitle: book1.bookmaker.title,
              odds: home1.price,
              point: home1.point,
              stake: 50,
            },
            {
              outcome: event.away_team,
              bookmaker: book2.bookmaker.key,
              bookmakerTitle: book2.bookmaker.title,
              odds: away2.price,
              point: away2.point,
              stake: 50,
            },
          ],
        });
      }
    }
  }

  // Check totals for middles
  const totalBooks: Map<string, { bookmaker: Bookmaker; outcomes: Outcome[] }> = new Map();

  for (const bm of event.bookmakers) {
    const totalMarket = bm.markets.find(m => m.key === 'totals');
    if (!totalMarket) continue;
    totalBooks.set(bm.key, { bookmaker: bm, outcomes: totalMarket.outcomes });
  }

  const totalBookKeys = Array.from(totalBooks.keys());

  for (let i = 0; i < totalBookKeys.length; i++) {
    for (let j = i + 1; j < totalBookKeys.length; j++) {
      const book1 = totalBooks.get(totalBookKeys[i])!;
      const book2 = totalBooks.get(totalBookKeys[j])!;

      const over1 = book1.outcomes.find(o => o.name === 'Over');
      const under1 = book1.outcomes.find(o => o.name === 'Under');
      const over2 = book2.outcomes.find(o => o.name === 'Over');
      const under2 = book2.outcomes.find(o => o.name === 'Under');

      if (!over1?.point || !under2?.point) continue;

      // Middle on totals: Over X at book1, Under Y at book2 where Y > X
      const middleWidth = (under2.point || 0) - (over1.point || 0);

      if (middleWidth >= MIN_MIDDLE_WIDTH) {
        const impliedProb = (1 / over1.price) + (1 / under2.price);
        const edgePct = Math.max(0, ((1 / impliedProb) - 1) * 100);

        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'totals',
          edgePct: Math.round(edgePct * 100) / 100,
          middleWidth: Math.round(middleWidth * 10) / 10,
          legs: [
            {
              outcome: 'Over',
              bookmaker: book1.bookmaker.key,
              bookmakerTitle: book1.bookmaker.title,
              odds: over1.price,
              point: over1.point,
              stake: 50,
            },
            {
              outcome: 'Under',
              bookmaker: book2.bookmaker.key,
              bookmakerTitle: book2.bookmaker.title,
              odds: under2.price,
              point: under2.point,
              stake: 50,
            },
          ],
        });
      }
    }
  }

  return opportunities;
}

function generateFingerprint(opp: Opportunity): string {
  return `${opp.eventId}::${opp.type}::${opp.marketKey}::${opp.legs.map(l => `${l.bookmaker}:${l.outcome}`).sort().join('|')}`;
}

async function main() {
  console.log('===========================================');
  console.log('    LIVE ODDS SCAN (Free Tier Friendly)');
  console.log('===========================================');
  console.log(`Scanning ${SPORTS_TO_SCAN.length} sports (uses 5 API credits)...`);
  console.log('===========================================\n');

  // Clear old data
  const deleted = await prisma.opportunity.deleteMany({});
  console.log(`Cleared ${deleted.count} old opportunities\n`);

  const allOpportunities: Opportunity[] = [];

  for (const sport of SPORTS_TO_SCAN) {
    console.log(`Scanning ${sport}...`);

    try {
      const events = await fetchOdds(sport);
      console.log(`  Found ${events.length} events`);

      let sportArbs = 0;
      let sportMiddles = 0;

      for (const event of events) {
        const arbs = detectArbitrages(event);
        const middles = detectMiddles(event);
        sportArbs += arbs.length;
        sportMiddles += middles.length;
        allOpportunities.push(...arbs, ...middles);
      }

      console.log(`  Detected: ${sportArbs} arbs, ${sportMiddles} middles`);
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  console.log(`\n===========================================`);
  console.log(`Total opportunities found: ${allOpportunities.length}`);
  console.log(`===========================================\n`);

  if (allOpportunities.length > 0) {
    console.log('Saving to database...');

    for (const opp of allOpportunities) {
      await prisma.opportunity.create({
        data: {
          fingerprint: generateFingerprint(opp),
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
          legs: opp.legs,
        },
      });
    }

    console.log(`Saved ${allOpportunities.length} opportunities to database`);
  } else {
    console.log('\nNo arbitrage opportunities found at this moment.');
    console.log('This is NORMAL - real arbs are rare because markets are efficient.');
    console.log('Try running the scan again in a few hours.\n');
  }

  const stats = await prisma.opportunity.groupBy({
    by: ['type'],
    _count: true,
  });
  console.log('Final stats:', stats);

  await prisma.$disconnect();
}

main().catch(console.error);
