import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Region configuration
const REGIONS = {
  us: {
    code: 'us',
    name: 'United States',
    sports: ['basketball_nba', 'icehockey_nhl', 'americanfootball_nfl', 'baseball_mlb'],
  },
  au: {
    code: 'au',
    name: 'Australia',
    sports: ['aussierules_afl', 'rugbyleague_nrl', 'basketball_nba', 'soccer_epl'],
  },
  uk: {
    code: 'uk',
    name: 'United Kingdom',
    sports: ['soccer_epl', 'soccer_uefa_champs_league', 'tennis_atp_aus_open', 'basketball_nba'],
  },
  eu: {
    code: 'eu',
    name: 'Europe',
    sports: ['soccer_epl', 'soccer_uefa_champs_league', 'basketball_euroleague', 'tennis_atp_aus_open'],
  },
};

// Get region from command line argument or default to 'us'
const regionArg = process.argv[2] || 'us';
const REGION = REGIONS[regionArg as keyof typeof REGIONS] || REGIONS.us;
const SPORTS_TO_SCAN = REGION.sports;

const MARKETS = ['h2h', 'spreads', 'totals'];
const API_KEY = process.env.ODDS_API_KEY || '1b48e5acc4ea9563cacc5a0892898868';
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
  const url = `${API_BASE}/sports/${sportKey}/odds?apiKey=${API_KEY}&regions=${REGION.code}&markets=${MARKETS.join(',')}&oddsFormat=decimal`;

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

  // Collect all bookmaker odds for h2h market
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

  if (h2hBooks.size < 2) return opportunities;

  // Check if this is a 3-way market (soccer) by looking for Draw outcome
  const firstBook = h2hBooks.values().next().value;
  const hasDrawOutcome = firstBook?.outcomes.has('Draw');

  if (hasDrawOutcome) {
    // 3-WAY ARBITRAGE (Soccer)
    // Need to cover all 3 outcomes: Home, Draw, Away
    // Find best odds for each outcome across ALL bookmakers
    let bestHome = { odds: 0, book: null as typeof firstBook | null };
    let bestDraw = { odds: 0, book: null as typeof firstBook | null };
    let bestAway = { odds: 0, book: null as typeof firstBook | null };

    for (const [, book] of h2hBooks) {
      const homeOdds = book.outcomes.get(event.home_team)?.price || 0;
      const drawOdds = book.outcomes.get('Draw')?.price || 0;
      const awayOdds = book.outcomes.get(event.away_team)?.price || 0;

      if (homeOdds > bestHome.odds) {
        bestHome = { odds: homeOdds, book };
      }
      if (drawOdds > bestDraw.odds) {
        bestDraw = { odds: drawOdds, book };
      }
      if (awayOdds > bestAway.odds) {
        bestAway = { odds: awayOdds, book };
      }
    }

    if (bestHome.odds > 0 && bestDraw.odds > 0 && bestAway.odds > 0 && bestHome.book && bestDraw.book && bestAway.book) {
      // 3-way arbitrage: 1/home + 1/draw + 1/away < 1
      const impliedProb = (1 / bestHome.odds) + (1 / bestDraw.odds) + (1 / bestAway.odds);

      if (impliedProb < 1) {
        const edgePct = ((1 / impliedProb) - 1) * 100;

        if (edgePct >= MIN_EDGE) {
          const totalStake = 100;
          const stakeHome = totalStake * (1 / bestHome.odds) / impliedProb;
          const stakeDraw = totalStake * (1 / bestDraw.odds) / impliedProb;
          const stakeAway = totalStake * (1 / bestAway.odds) / impliedProb;

          opportunities.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            commenceTime: new Date(event.commence_time),
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            type: 'ARB',
            marketKey: 'h2h_3way',
            edgePct: Math.round(edgePct * 100) / 100,
            middleWidth: null,
            legs: [
              {
                outcome: event.home_team,
                bookmaker: bestHome.book.bookmaker.key,
                bookmakerTitle: bestHome.book.bookmaker.title,
                odds: bestHome.odds,
                stake: Math.round(stakeHome * 100) / 100,
              },
              {
                outcome: 'Draw',
                bookmaker: bestDraw.book.bookmaker.key,
                bookmakerTitle: bestDraw.book.bookmaker.title,
                odds: bestDraw.odds,
                stake: Math.round(stakeDraw * 100) / 100,
              },
              {
                outcome: event.away_team,
                bookmaker: bestAway.book.bookmaker.key,
                bookmakerTitle: bestAway.book.bookmaker.title,
                odds: bestAway.odds,
                stake: Math.round(stakeAway * 100) / 100,
              },
            ],
          });
        }
      }
    }
  } else {
    // 2-WAY ARBITRAGE (Basketball, NFL, NHL, etc.)
    // Find best odds for each outcome across ALL bookmakers
    let bestHome = { odds: 0, book: null as typeof firstBook | null };
    let bestAway = { odds: 0, book: null as typeof firstBook | null };

    for (const [, book] of h2hBooks) {
      const homeOdds = book.outcomes.get(event.home_team)?.price || 0;
      const awayOdds = book.outcomes.get(event.away_team)?.price || 0;

      if (homeOdds > bestHome.odds) {
        bestHome = { odds: homeOdds, book };
      }
      if (awayOdds > bestAway.odds) {
        bestAway = { odds: awayOdds, book };
      }
    }

    if (bestHome.odds > 0 && bestAway.odds > 0 && bestHome.book && bestAway.book) {
      // 2-way arbitrage: 1/home + 1/away < 1
      const impliedProb = (1 / bestHome.odds) + (1 / bestAway.odds);

      if (impliedProb < 1) {
        const edgePct = ((1 / impliedProb) - 1) * 100;

        if (edgePct >= MIN_EDGE) {
          const totalStake = 100;
          const stakeHome = totalStake * (1 / bestHome.odds) / impliedProb;
          const stakeAway = totalStake * (1 / bestAway.odds) / impliedProb;

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
                outcome: event.home_team,
                bookmaker: bestHome.book.bookmaker.key,
                bookmakerTitle: bestHome.book.bookmaker.title,
                odds: bestHome.odds,
                stake: Math.round(stakeHome * 100) / 100,
              },
              {
                outcome: event.away_team,
                bookmaker: bestAway.book.bookmaker.key,
                bookmakerTitle: bestAway.book.bookmaker.title,
                odds: bestAway.odds,
                stake: Math.round(stakeAway * 100) / 100,
              },
            ],
          });
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
  console.log(`Region: ${REGION.name} (${REGION.code})`);
  console.log(`Scanning ${SPORTS_TO_SCAN.length} sports...`);
  console.log(`Sports: ${SPORTS_TO_SCAN.join(', ')}`);
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

    // Deduplicate by fingerprint before saving
    const uniqueOpps = new Map<string, Opportunity>();
    for (const opp of allOpportunities) {
      const fp = generateFingerprint(opp);
      // Keep the one with the higher edge
      if (!uniqueOpps.has(fp) || opp.edgePct > (uniqueOpps.get(fp)?.edgePct || 0)) {
        uniqueOpps.set(fp, opp);
      }
    }

    console.log(`Deduped to ${uniqueOpps.size} unique opportunities`);

    for (const opp of uniqueOpps.values()) {
      await prisma.opportunity.upsert({
        where: { fingerprint: generateFingerprint(opp) },
        update: {
          edgePct: opp.edgePct,
          middleWidth: opp.middleWidth,
          legs: opp.legs,
        },
        create: {
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

    console.log(`Saved ${uniqueOpps.size} opportunities to database`);
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
