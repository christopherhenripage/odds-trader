import { OpportunityLeg, Opportunity, OpportunityWithStakes } from './types';

/**
 * Calculate optimal stakes for an arbitrage opportunity
 *
 * For a guaranteed profit regardless of outcome:
 * stake_i = (S / odds_i) / sum(1/odds_j)
 *
 * Where S is the total stake amount
 */
export function calculateArbStakes(
  legs: OpportunityLeg[],
  totalStake: number
): OpportunityLeg[] {
  // Calculate sum of inverse odds
  const inverseSum = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);

  // Calculate individual stakes
  const stakesRaw = legs.map(leg => ({
    ...leg,
    stake: (totalStake / leg.odds) / inverseSum,
  }));

  // Round to cents
  const stakesRounded = stakesRaw.map(leg => ({
    ...leg,
    stake: Math.floor(leg.stake! * 100) / 100,
  }));

  // Adjust last stake to ensure total matches
  const currentTotal = stakesRounded.reduce((sum, leg) => sum + leg.stake!, 0);
  const diff = totalStake - currentTotal;

  if (stakesRounded.length > 0) {
    stakesRounded[stakesRounded.length - 1].stake! += Math.round(diff * 100) / 100;
  }

  return stakesRounded;
}

/**
 * Calculate the guaranteed profit for an arbitrage
 */
export function calculateGuaranteedProfit(
  legs: OpportunityLeg[],
  totalStake: number
): number {
  const inverseSum = legs.reduce((sum, leg) => sum + (1 / leg.odds), 0);

  // With optimal stakes, payout on any outcome is: totalStake / inverseSum
  const guaranteedPayout = totalStake / inverseSum;
  const profit = guaranteedPayout - totalStake;

  return Math.round(profit * 100) / 100;
}

/**
 * Calculate payout for a specific outcome
 */
export function calculatePayout(stake: number, odds: number): number {
  return Math.round(stake * odds * 100) / 100;
}

/**
 * Calculate stakes for middle opportunity
 * For middles, we typically want equal risk on both sides
 */
export function calculateMiddleStakes(
  legs: OpportunityLeg[],
  totalStake: number
): OpportunityLeg[] {
  if (legs.length !== 2) {
    return calculateArbStakes(legs, totalStake);
  }

  // For a 2-leg middle, split the stake to equalize potential losses
  // If both outcomes lose (score not in middle), we want equal losses
  const [leg1, leg2] = legs;

  // Equal stake per leg for simplicity
  // More sophisticated: weight by probability of each outcome
  const stakePerLeg = totalStake / 2;

  return legs.map(leg => ({
    ...leg,
    stake: Math.round(stakePerLeg * 100) / 100,
  }));
}

/**
 * Calculate potential outcomes for a middle bet
 */
export function calculateMiddleOutcomes(
  legs: OpportunityLeg[],
  totalStake: number
): {
  bothWin: number;     // Profit if score lands in middle
  leg1Wins: number;    // Profit/loss if only leg1 wins
  leg2Wins: number;    // Profit/loss if only leg2 wins
  bothLose: number;    // Loss if neither wins (shouldn't happen for proper middle)
} {
  const stakedLegs = calculateMiddleStakes(legs, totalStake);
  const [leg1, leg2] = stakedLegs;

  const payout1 = calculatePayout(leg1.stake!, leg1.odds);
  const payout2 = calculatePayout(leg2.stake!, leg2.odds);

  return {
    bothWin: payout1 + payout2 - totalStake,
    leg1Wins: payout1 - totalStake,
    leg2Wins: payout2 - totalStake,
    bothLose: -totalStake,
  };
}

/**
 * Add stakes to an opportunity
 */
export function addStakesToOpportunity(
  opportunity: Opportunity,
  totalStake: number
): OpportunityWithStakes {
  const legsWithStakes = opportunity.type === 'ARB'
    ? calculateArbStakes(opportunity.legs, totalStake)
    : calculateMiddleStakes(opportunity.legs, totalStake);

  const guaranteedProfit = opportunity.type === 'ARB'
    ? calculateGuaranteedProfit(opportunity.legs, totalStake)
    : 0; // Middles don't have guaranteed profit

  return {
    ...opportunity,
    legs: legsWithStakes,
    totalStake,
    guaranteedProfit,
  };
}

/**
 * Validate that stakes are valid
 */
export function validateStakes(legs: OpportunityLeg[]): boolean {
  return legs.every(leg =>
    leg.stake !== undefined &&
    leg.stake > 0 &&
    !isNaN(leg.stake) &&
    isFinite(leg.stake)
  );
}

/**
 * Format stake for display
 */
export function formatStake(stake: number): string {
  return stake.toFixed(2);
}

/**
 * Format odds for display
 */
export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/**
 * Convert American odds to decimal
 */
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

/**
 * Convert decimal odds to American
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

/**
 * Calculate implied probability from decimal odds
 */
export function impliedProbability(odds: number): number {
  return 1 / odds;
}

/**
 * Calculate ROI percentage
 */
export function calculateROI(profit: number, stake: number): number {
  if (stake === 0) return 0;
  return Math.round((profit / stake) * 10000) / 100;
}
