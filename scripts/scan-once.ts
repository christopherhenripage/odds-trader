import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive sports list - all non-outright sports from The Odds API
const ALL_SPORTS = [
  // American Football
  'americanfootball_nfl',
  // Aussie Rules
  'aussierules_afl',
  // Basketball
  'basketball_euroleague',
  'basketball_nba',
  'basketball_nbl',
  'basketball_ncaab',
  'basketball_wncaab',
  // Boxing
  'boxing_boxing',
  // Cricket
  'cricket_big_bash',
  'cricket_international_t20',
  'cricket_odi',
  // Ice Hockey
  'icehockey_ahl',
  'icehockey_liiga',
  'icehockey_mestis',
  'icehockey_nhl',
  'icehockey_sweden_allsvenskan',
  'icehockey_sweden_hockey_league',
  // Lacrosse
  'lacrosse_ncaa',
  // MMA
  'mma_mixed_martial_arts',
  // Rugby League
  'rugbyleague_nrl',
  // Rugby Union
  'rugbyunion_six_nations',
  // Soccer - Major Leagues
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
  'soccer_netherlands_eredivisie',
  'soccer_portugal_primeira_liga',
  // Soccer - Secondary Leagues
  'soccer_efl_champ',
  'soccer_england_league1',
  'soccer_england_league2',
  'soccer_germany_bundesliga2',
  'soccer_italy_serie_b',
  'soccer_spain_segunda_division',
  'soccer_france_ligue_two',
  // Soccer - Other European
  'soccer_belgium_first_div',
  'soccer_austria_bundesliga',
  'soccer_switzerland_superleague',
  'soccer_denmark_superliga',
  'soccer_greece_super_league',
  'soccer_turkey_super_league',
  'soccer_spl',
  'soccer_league_of_ireland',
  // Soccer - Cups & European
  'soccer_uefa_champs_league',
  'soccer_uefa_europa_league',
  'soccer_fa_cup',
  'soccer_england_efl_cup',
  'soccer_fifa_world_cup_qualifiers_europe',
  // Soccer - Americas
  'soccer_usa_mls',
  'soccer_mexico_ligamx',
  'soccer_brazil_campeonato',
  'soccer_argentina_primera_division',
  'soccer_chile_campeonato',
  'soccer_conmebol_copa_libertadores',
  'soccer_conmebol_copa_sudamericana',
  // Soccer - Other
  'soccer_australia_aleague',
  // Tennis
  'tennis_atp_aus_open_singles',
  'tennis_wta_aus_open_singles',
];

// Region configuration - determines which bookmakers to query
const REGIONS = {
  us: {
    code: 'us',
    name: 'United States',
    sports: ALL_SPORTS, // Scan all sports
  },
  au: {
    code: 'au',
    name: 'Australia',
    sports: ALL_SPORTS, // Scan all sports
  },
  nz: {
    code: 'au', // NZ uses AU bookmakers
    name: 'New Zealand',
    sports: ALL_SPORTS, // Scan all sports
  },
  uk: {
    code: 'uk',
    name: 'United Kingdom',
    sports: ALL_SPORTS, // Scan all sports
  },
  eu: {
    code: 'eu',
    name: 'Europe',
    sports: ALL_SPORTS, // Scan all sports
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

  // Add delay to avoid rate limiting (1 second between requests)
  await sleep(1000);

  const response = await fetch(url);

  if (!response.ok) {
    // 404 means no events for this sport - not an error
    if (response.status === 404) {
      return [];
    }
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const remaining = response.headers.get('x-requests-remaining');
  if (remaining) {
    console.log(`  Credits: ${remaining}`);
  }

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
      // IMPORTANT: Must use at least 2 different bookmakers for a real arbitrage
      const bookmakers = new Set([
        bestHome.book.bookmaker.key,
        bestDraw.book.bookmaker.key,
        bestAway.book.bookmaker.key,
      ]);
      if (bookmakers.size < 2) {
        // All from same bookmaker - not a real arbitrage
        return opportunities;
      }

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
      // IMPORTANT: Must use DIFFERENT bookmakers for a real arbitrage
      if (bestHome.book.bookmaker.key === bestAway.book.bookmaker.key) {
        // Same bookmaker - not a real arbitrage (can't bet both sides at same book)
        return opportunities;
      }

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
        // For middles, there's no guaranteed edge - it's speculative
        // edgePct = 0 for middles, middleWidth shows the window size
        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'spreads',
          edgePct: 0, // No guaranteed edge for middles
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
        // For middles, there's no guaranteed edge - it's speculative
        opportunities.push({
          eventId: event.id,
          sportKey: event.sport_key,
          sportTitle: event.sport_title,
          commenceTime: new Date(event.commence_time),
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          type: 'MIDDLE',
          marketKey: 'totals',
          edgePct: 0, // No guaranteed edge for middles
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

  let scannedCount = 0;
  for (const sport of SPORTS_TO_SCAN) {
    scannedCount++;
    process.stdout.write(`\r[${scannedCount}/${SPORTS_TO_SCAN.length}] Scanning ${sport}...`.padEnd(70));

    try {
      const events = await fetchOdds(sport);

      if (events.length === 0) {
        continue; // Skip sports with no events
      }

      let sportArbs = 0;
      let sportMiddles = 0;

      for (const event of events) {
        const arbs = detectArbitrages(event);
        const middles = detectMiddles(event);
        sportArbs += arbs.length;
        sportMiddles += middles.length;
        allOpportunities.push(...arbs, ...middles);
      }

      if (sportArbs > 0 || sportMiddles > 0) {
        console.log(`\n  ${sport}: ${events.length} events, ${sportArbs} arbs, ${sportMiddles} middles`);
      }
    } catch (error) {
      console.error(`\n  Error scanning ${sport}: ${error}`);
    }
  }
  console.log(); // New line after progress

  console.log(`\n===========================================`);
  console.log(`Total opportunities found: ${allOpportunities.length}`);
  console.log(`===========================================\n`);

  if (allOpportunities.length > 0) {
    console.log('Saving to database...');

    // Deduplicate by event/market/type - keep only the BEST opportunity for each
    const uniqueOpps = new Map<string, Opportunity>();
    for (const opp of allOpportunities) {
      const eventKey = generateEventKey(opp);
      const existing = uniqueOpps.get(eventKey);

      if (!existing) {
        uniqueOpps.set(eventKey, opp);
      } else {
        // For ARBs, compare by edgePct; for MIDDLEs, compare by middleWidth
        const isBetter = opp.type === 'ARB'
          ? opp.edgePct > existing.edgePct
          : (opp.middleWidth || 0) > (existing.middleWidth || 0);

        if (isBetter) {
          uniqueOpps.set(eventKey, opp);
        }
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
