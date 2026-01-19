import {
  NormalizedEvent,
  NormalizedMarket,
  NormalizedOutcome,
  Opportunity,
  OpportunityLeg,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
  MarketKey,
} from './types';
import { generateFingerprint } from './dedupe';

/**
 * Detect arbitrage opportunities in a normalized event
 *
 * For 2-way markets: 1/o1 + 1/o2 < 1 indicates arbitrage
 * For 3-way markets: sum(1/oi) < 1 indicates arbitrage
 * Edge % = (1 - sum(1/oi)) * 100
 */
export function detectArbitrages(
  event: NormalizedEvent,
  config: DetectionConfig = DEFAULT_DETECTION_CONFIG
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const market of event.markets) {
    const arbOpps = detectMarketArbitrage(event, market, config);
    opportunities.push(...arbOpps);
  }

  return opportunities;
}

function detectMarketArbitrage(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  if (market.key === 'h2h') {
    // H2H can be 2-way or 3-way
    const arbs = findBestOddsArbitrage(event, market, config);
    opportunities.push(...arbs);
  } else if (market.key === 'totals') {
    // Totals: Over/Under at same line - 2-way
    const arbs = findTotalsArbitrage(event, market, config);
    opportunities.push(...arbs);
  } else if (market.key === 'spreads') {
    // Spreads: 2-way per team
    const arbs = findSpreadsArbitrage(event, market, config);
    opportunities.push(...arbs);
  }

  return opportunities;
}

/**
 * Find best odds arbitrage for H2H markets
 * Groups outcomes by name and finds best odds from different bookmakers
 */
function findBestOddsArbitrage(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Group outcomes by name (e.g., "Home", "Away", "Draw")
  const outcomesByName = new Map<string, NormalizedOutcome[]>();

  for (const outcome of market.outcomes) {
    const existing = outcomesByName.get(outcome.name) || [];
    existing.push(outcome);
    outcomesByName.set(outcome.name, existing);
  }

  // Get all unique outcome names
  const outcomeNames = Array.from(outcomesByName.keys());

  if (outcomeNames.length < 2) return opportunities;

  // Get best odds for each outcome
  const bestOdds: Map<string, NormalizedOutcome> = new Map();
  for (const [name, outcomes] of outcomesByName) {
    const best = outcomes.reduce((a, b) => a.price > b.price ? a : b);
    bestOdds.set(name, best);
  }

  // Calculate implied probability sum
  const impliedProbSum = Array.from(bestOdds.values())
    .reduce((sum, o) => sum + (1 / o.price), 0);

  // Check if arbitrage exists
  if (impliedProbSum < 1) {
    const edgePct = (1 - impliedProbSum) * 100;

    if (edgePct >= config.minEdge) {
      const legs: OpportunityLeg[] = Array.from(bestOdds.entries()).map(([name, outcome]) => ({
        outcome: name,
        bookmaker: outcome.bookmaker,
        bookmakerTitle: outcome.bookmakerTitle,
        odds: outcome.price,
        point: outcome.point,
      }));

      const fingerprint = generateFingerprint(event.id, market.key, 'ARB', legs);

      opportunities.push({
        fingerprint,
        eventId: event.id,
        sportKey: event.sportKey,
        sportTitle: event.sportTitle,
        commenceTime: event.commenceTime,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        type: 'ARB',
        marketKey: market.key,
        edgePct: Math.round(edgePct * 100) / 100,
        legs,
      });
    }
  }

  return opportunities;
}

/**
 * Find arbitrage in totals markets (Over/Under at same line)
 */
function findTotalsArbitrage(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Group by point value (the line)
  const byLine = new Map<number, { overs: NormalizedOutcome[], unders: NormalizedOutcome[] }>();

  for (const outcome of market.outcomes) {
    if (outcome.point === undefined) continue;

    const line = outcome.point;
    const existing = byLine.get(line) || { overs: [], unders: [] };

    if (outcome.name.toLowerCase().includes('over')) {
      existing.overs.push(outcome);
    } else if (outcome.name.toLowerCase().includes('under')) {
      existing.unders.push(outcome);
    }

    byLine.set(line, existing);
  }

  // Check each line for arbitrage
  for (const [line, { overs, unders }] of byLine) {
    if (overs.length === 0 || unders.length === 0) continue;

    const bestOver = overs.reduce((a, b) => a.price > b.price ? a : b);
    const bestUnder = unders.reduce((a, b) => a.price > b.price ? a : b);

    // Must be from different bookmakers to be true arb
    if (bestOver.bookmaker === bestUnder.bookmaker) continue;

    const impliedProbSum = (1 / bestOver.price) + (1 / bestUnder.price);

    if (impliedProbSum < 1) {
      const edgePct = (1 - impliedProbSum) * 100;

      if (edgePct >= config.minEdge) {
        const legs: OpportunityLeg[] = [
          {
            outcome: bestOver.name,
            bookmaker: bestOver.bookmaker,
            bookmakerTitle: bestOver.bookmakerTitle,
            odds: bestOver.price,
            point: bestOver.point,
          },
          {
            outcome: bestUnder.name,
            bookmaker: bestUnder.bookmaker,
            bookmakerTitle: bestUnder.bookmakerTitle,
            odds: bestUnder.price,
            point: bestUnder.point,
          },
        ];

        const fingerprint = generateFingerprint(event.id, market.key, 'ARB', legs);

        opportunities.push({
          fingerprint,
          eventId: event.id,
          sportKey: event.sportKey,
          sportTitle: event.sportTitle,
          commenceTime: event.commenceTime,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          type: 'ARB',
          marketKey: market.key,
          edgePct: Math.round(edgePct * 100) / 100,
          legs,
        });
      }
    }
  }

  return opportunities;
}

/**
 * Find arbitrage in spreads markets
 */
function findSpreadsArbitrage(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Group by absolute point value (home +3.5 pairs with away -3.5)
  // We need to find complementary spreads
  const homeOutcomes = market.outcomes.filter(o =>
    o.name === event.homeTeam || o.name.toLowerCase().includes('home')
  );
  const awayOutcomes = market.outcomes.filter(o =>
    o.name === event.awayTeam || o.name.toLowerCase().includes('away')
  );

  // For each home spread, find matching away spread (opposite sign)
  for (const home of homeOutcomes) {
    if (home.point === undefined) continue;

    // Find away outcomes with opposite spread
    const matchingAway = awayOutcomes.filter(a =>
      a.point !== undefined && Math.abs(a.point + home.point!) < 0.01
    );

    for (const away of matchingAway) {
      if (home.bookmaker === away.bookmaker) continue;

      const impliedProbSum = (1 / home.price) + (1 / away.price);

      if (impliedProbSum < 1) {
        const edgePct = (1 - impliedProbSum) * 100;

        if (edgePct >= config.minEdge) {
          const legs: OpportunityLeg[] = [
            {
              outcome: home.name,
              bookmaker: home.bookmaker,
              bookmakerTitle: home.bookmakerTitle,
              odds: home.price,
              point: home.point,
            },
            {
              outcome: away.name,
              bookmaker: away.bookmaker,
              bookmakerTitle: away.bookmakerTitle,
              odds: away.price,
              point: away.point,
            },
          ];

          const fingerprint = generateFingerprint(event.id, market.key, 'ARB', legs);

          opportunities.push({
            fingerprint,
            eventId: event.id,
            sportKey: event.sportKey,
            sportTitle: event.sportTitle,
            commenceTime: event.commenceTime,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            type: 'ARB',
            marketKey: market.key,
            edgePct: Math.round(edgePct * 100) / 100,
            legs,
          });
        }
      }
    }
  }

  return opportunities;
}

/**
 * Check if a set of legs constitutes an arbitrage
 */
export function isArbitrage(legs: OpportunityLeg[]): boolean {
  const impliedProbSum = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);
  return impliedProbSum < 1;
}

/**
 * Calculate edge percentage for given legs
 */
export function calculateEdge(legs: OpportunityLeg[]): number {
  const impliedProbSum = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);
  return (1 - impliedProbSum) * 100;
}
