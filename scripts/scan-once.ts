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
  nz: {
    code: 'au', // NZ uses AU bookmakers (many operate in both countries)
    name: 'New Zealand',
    sports: ['rugbyleague_nrl', 'rugbyunion_super_rugby', 'basketball_nba', 'soccer_epl'],
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
const MIN_MIDDLE_WIDTH = 1.5; // Require at least 1.5 points of middle room

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
  // A spread middle occurs when you can bet both sides and have a window where both win
  // Example: Home -3 at Book1, Away +5 at Book2
  // If home wins by 4, BOTH bets win (Home covered -3, Away covered +5)
  const spreadBooks: Map<string, { bookmaker: Bookmaker; outcomes: Outcome[] }> = new Map();

  for (const bm of event.bookmakers) {
    const spreadMarket = bm.markets.find(m => m.key === 'spreads');
    if (!spreadMarket) continue;
    spreadBooks.set(bm.key, { bookmaker: bm, outcomes: spreadMarket.outcomes });
  }

  const bookKeys = Array.from(spreadBooks.keys());

  for (let i = 0; i < bookKeys.length; i++) {
    for (let j = i + 1; j < bookKeys.length; j++) {
      const book1 = spreadBooks.get(bookKeys[i])!;
      const book2 = spreadBooks.get(bookKeys[j])!;

      const home1 = book1.outcomes.find(o => o.name === event.home_team);
      const away2 = book2.outcomes.find(o => o.name === event.away_team);

      if (!home1?.point || !away2?.point) continue;

      // For a middle to exist:
      // Home spread (negative means favorite): e.g., -3.5
      // Away spread (positive means underdog): e.g., +5.5
      // Middle width = away2.point - Math.abs(home1.point)
      // If home1.point = -3.5 and away2.point = +5.5, middle = 5.5 - 3.5 = 2 points
      // Margin of victory between 4 and 5 wins both bets

      const homeSpread = home1.point; // Usually negative for favorite
      const awaySpread = away2.point; // Usually positive for underdog

      // Middle exists when away spread > abs(home spread)
      // e.g., Home -3 and Away +5 creates a 2-point middle
      const middleWidth = awaySpread + homeSpread; // e.g., 5 + (-3) = 2

      if (middleWidth >= MIN_MIDDLE_WIDTH) {
        // For middles, we don't calculate arbitrage edge
        // Instead, middleWidth shows the window size where both bets win
        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'spreads',
          edgePct: middleWidth, // Show middle width as the "edge" indicator
          middleWidth: Math.round(middleWidth * 10) / 10,
          legs: [
            {
              outcome: `${event.home_team} ${homeSpread > 0 ? '+' : ''}${homeSpread}`,
              bookmaker: book1.bookmaker.key,
              bookmakerTitle: book1.bookmaker.title,
              odds: home1.price,
              point: home1.point,
              stake: 50,
            },
            {
              outcome: `${event.away_team} ${awaySpread > 0 ? '+' : ''}${awaySpread}`,
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
  // A totals middle: Over 220 at Book1, Under 223 at Book2
  // If total = 221 or 222, BOTH win
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
      const under2 = book2.outcomes.find(o => o.name === 'Under');

      if (!over1?.point || !under2?.point) continue;

      // Middle on totals: Under line must be higher than Over line
      // Over 220 at book1, Under 223 at book2 = 3 point middle
      const middleWidth = under2.point - over1.point;

      if (middleWidth >= MIN_MIDDLE_WIDTH) {
        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'totals',
          edgePct: middleWidth, // Show middle width as the "edge" indicator
          middleWidth: Math.round(middleWidth * 10) / 10,
          legs: [
            {
              outcome: `Over ${over1.point}`,
              bookmaker: book1.bookmaker.key,
              bookmakerTitle: book1.bookmaker.title,
              odds: over1.price,
              point: over1.point,
              stake: 50,
            },
            {
              outcome: `Under ${under2.point}`,
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
  // Include bookmaker details in fingerprint for database uniqueness
  return `${opp.eventId}::${opp.type}::${opp.marketKey}::${opp.legs.map(l => `${l.bookmaker}:${l.outcome}`).sort().join('|')}`;
}

function generateEventKey(opp: Opportunity): string {
  // For deduplication: one opportunity per event/market/type
  return `${opp.eventId}::${opp.type}::${opp.marketKey}`;
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

    // Deduplicate by event/market/type - keep only the BEST opportunity for each
    const uniqueOpps = new Map<string, Opportunity>();
    for (const opp of allOpportunities) {
      const eventKey = generateEventKey(opp);
      // Keep the one with the higher edge/width
      if (!uniqueOpps.has(eventKey) || opp.edgePct > (uniqueOpps.get(eventKey)?.edgePct || 0)) {
        uniqueOpps.set(eventKey, opp);
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
