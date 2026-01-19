import {
  NormalizedEvent,
  NormalizedMarket,
  NormalizedOutcome,
  Opportunity,
  OpportunityLeg,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
} from './types';
import { generateFingerprint } from './dedupe';

/**
 * Detect middle opportunities in a normalized event
 *
 * Totals middle: Over at X and Under at Y where Y > X
 * Spreads middle: TeamA +p and TeamB +q where width ≈ p + q
 */
export function detectMiddles(
  event: NormalizedEvent,
  config: DetectionConfig = DEFAULT_DETECTION_CONFIG
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const market of event.markets) {
    if (market.key === 'totals') {
      const middles = detectTotalsMiddles(event, market, config);
      opportunities.push(...middles);
    } else if (market.key === 'spreads') {
      const middles = detectSpreadsMiddles(event, market, config);
      opportunities.push(...middles);
    }
  }

  return opportunities;
}

/**
 * Detect totals middles
 * Over at X and Under at Y where Y > X creates a "middle" window
 */
function detectTotalsMiddles(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Collect all overs and unders with their lines
  const overs: NormalizedOutcome[] = [];
  const unders: NormalizedOutcome[] = [];

  for (const outcome of market.outcomes) {
    if (outcome.point === undefined) continue;

    if (outcome.name.toLowerCase().includes('over')) {
      overs.push(outcome);
    } else if (outcome.name.toLowerCase().includes('under')) {
      unders.push(outcome);
    }
  }

  // Look for Over X + Under Y where Y > X
  for (const over of overs) {
    for (const under of unders) {
      if (over.point === undefined || under.point === undefined) continue;

      // Middle exists when under line > over line
      const width = under.point - over.point;

      if (width >= config.minMiddleWidth) {
        // Must be from different bookmakers to be useful
        if (over.bookmaker === under.bookmaker) continue;

        // Calculate combined edge (not guaranteed profit, but potential)
        // For middles, we look at the combined implied probability
        const impliedProbSum = (1 / over.price) + (1 / under.price);
        const edgePct = (1 - impliedProbSum) * 100;

        // Even if edge is negative, a middle is valuable if width is significant
        // But we still want some minimum edge for it to be worth it
        if (edgePct >= -5) { // Allow slightly negative edge for good width
          const legs: OpportunityLeg[] = [
            {
              outcome: over.name,
              bookmaker: over.bookmaker,
              bookmakerTitle: over.bookmakerTitle,
              odds: over.price,
              point: over.point,
            },
            {
              outcome: under.name,
              bookmaker: under.bookmaker,
              bookmakerTitle: under.bookmakerTitle,
              odds: under.price,
              point: under.point,
            },
          ];

          const fingerprint = generateFingerprint(event.id, market.key, 'MIDDLE', legs);

          opportunities.push({
            fingerprint,
            eventId: event.id,
            sportKey: event.sportKey,
            sportTitle: event.sportTitle,
            commenceTime: event.commenceTime,
            homeTeam: event.homeTeam,
            awayTeam: event.awayTeam,
            type: 'MIDDLE',
            marketKey: market.key,
            edgePct: Math.round(edgePct * 100) / 100,
            middleWidth: Math.round(width * 100) / 100,
            legs,
          });
        }
      }
    }
  }

  // Sort by width descending and take best opportunities
  return opportunities.sort((a, b) => (b.middleWidth || 0) - (a.middleWidth || 0));
}

/**
 * Detect spreads middles (conservative)
 * TeamA +p and TeamB +q where width ≈ |p| + |q|
 */
function detectSpreadsMiddles(
  event: NormalizedEvent,
  market: NormalizedMarket,
  config: DetectionConfig
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Group outcomes by team
  const homeOutcomes = market.outcomes.filter(o =>
    o.name === event.homeTeam || o.name.toLowerCase().includes('home')
  );
  const awayOutcomes = market.outcomes.filter(o =>
    o.name === event.awayTeam || o.name.toLowerCase().includes('away')
  );

  // Look for both teams with positive spreads from different books
  // Home +p and Away +q creates middle when p + q gives enough width
  for (const home of homeOutcomes) {
    if (home.point === undefined) continue;

    for (const away of awayOutcomes) {
      if (away.point === undefined) continue;

      // Must be from different bookmakers
      if (home.bookmaker === away.bookmaker) continue;

      // For a spread middle, we want both to be "getting points"
      // Home +3.5 and Away +2.5 means if home wins by 1-3, both bets win
      // Width = home.point + away.point (when both are positive)
      // Or if signs differ, we calculate differently

      // Conservative approach: both spreads should be positive
      // Width = homeSpread + awaySpread
      if (home.point > 0 && away.point > 0) {
        // Both teams getting points - classic middle scenario
        const width = home.point + away.point;

        if (width >= config.minMiddleWidth) {
          const impliedProbSum = (1 / home.price) + (1 / away.price);
          const edgePct = (1 - impliedProbSum) * 100;

          // Allow negative edge for spread middles since the middle opportunity is valuable
          if (edgePct >= -10) {
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

            const fingerprint = generateFingerprint(event.id, market.key, 'MIDDLE', legs);

            opportunities.push({
              fingerprint,
              eventId: event.id,
              sportKey: event.sportKey,
              sportTitle: event.sportTitle,
              commenceTime: event.commenceTime,
              homeTeam: event.homeTeam,
              awayTeam: event.awayTeam,
              type: 'MIDDLE',
              marketKey: market.key,
              edgePct: Math.round(edgePct * 100) / 100,
              middleWidth: Math.round(width * 100) / 100,
              legs,
            });
          }
        }
      }
    }
  }

  return opportunities.sort((a, b) => (b.middleWidth || 0) - (a.middleWidth || 0));
}

/**
 * Check if a set of legs constitutes a middle opportunity
 */
export function isMiddle(legs: OpportunityLeg[]): boolean {
  if (legs.length !== 2) return false;

  const [leg1, leg2] = legs;

  // Check if both have points
  if (leg1.point === undefined || leg2.point === undefined) return false;

  // Check if they're from different bookmakers
  if (leg1.bookmaker === leg2.bookmaker) return false;

  // For totals: Over at lower line, Under at higher line
  const isOverUnder =
    (leg1.outcome.toLowerCase().includes('over') && leg2.outcome.toLowerCase().includes('under')) ||
    (leg1.outcome.toLowerCase().includes('under') && leg2.outcome.toLowerCase().includes('over'));

  if (isOverUnder) {
    const overLeg = leg1.outcome.toLowerCase().includes('over') ? leg1 : leg2;
    const underLeg = leg1.outcome.toLowerCase().includes('under') ? leg1 : leg2;
    return underLeg.point! > overLeg.point!;
  }

  // For spreads: both positive points
  return leg1.point > 0 && leg2.point > 0;
}

/**
 * Calculate middle width
 */
export function calculateMiddleWidth(legs: OpportunityLeg[]): number {
  if (legs.length !== 2) return 0;

  const [leg1, leg2] = legs;

  if (leg1.point === undefined || leg2.point === undefined) return 0;

  // For totals
  const isOverUnder =
    (leg1.outcome.toLowerCase().includes('over') && leg2.outcome.toLowerCase().includes('under')) ||
    (leg1.outcome.toLowerCase().includes('under') && leg2.outcome.toLowerCase().includes('over'));

  if (isOverUnder) {
    const overLeg = leg1.outcome.toLowerCase().includes('over') ? leg1 : leg2;
    const underLeg = leg1.outcome.toLowerCase().includes('under') ? leg1 : leg2;
    return underLeg.point! - overLeg.point!;
  }

  // For spreads with both positive
  if (leg1.point > 0 && leg2.point > 0) {
    return leg1.point + leg2.point;
  }

  return 0;
}
