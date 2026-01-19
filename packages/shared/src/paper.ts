import {
  Opportunity,
  OpportunityLeg,
  PaperSimulationConfig,
  PaperFillResult,
  DEFAULT_PAPER_SIM_CONFIG,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
} from './types';
import { calculateEdge } from './arb';

/**
 * Simulate paper trading fill with latency, slippage, and miss probability
 */
export async function simulatePaperFill(
  opportunity: Opportunity,
  simConfig: PaperSimulationConfig = DEFAULT_PAPER_SIM_CONFIG,
  detectionConfig: DetectionConfig = DEFAULT_DETECTION_CONFIG
): Promise<PaperFillResult> {
  const originalEdge = opportunity.edgePct;
  const originalLegs = opportunity.legs.map(leg => ({ ...leg }));

  // Simulate latency
  const latencyMs = randomInRange(simConfig.latencyMsMin, simConfig.latencyMsMax);
  await sleep(latencyMs);

  // Check for miss
  if (Math.random() < simConfig.missFillProb) {
    return {
      filled: false,
      status: 'MISSED',
      originalEdge,
      finalEdge: originalEdge,
      originalLegs,
      finalLegs: originalLegs,
      latencyMs,
      slippageApplied: [],
    };
  }

  // Apply slippage to each leg
  const slippageApplied: number[] = [];
  const finalLegs: OpportunityLeg[] = originalLegs.map(leg => {
    // Calculate slippage amount
    const slippageDecimal = simConfig.slippageBps / 10000;
    const slippageAmount = Math.max(leg.odds * slippageDecimal, 0.01);

    // Cap slippage by maxLegOddsWorsen
    const cappedSlippage = Math.min(slippageAmount, simConfig.maxLegOddsWorsen);

    // Apply slippage (reduce odds, making them worse for the bettor)
    let newOdds = leg.odds - cappedSlippage;

    // Ensure odds don't go below 1.01
    newOdds = Math.max(newOdds, 1.01);

    slippageApplied.push(leg.odds - newOdds);

    return {
      ...leg,
      odds: Math.round(newOdds * 100) / 100,
    };
  });

  // Recalculate edge with new odds
  const finalEdge = calculateEdge(finalLegs);

  // Check if edge is still acceptable
  if (finalEdge < detectionConfig.minEdge) {
    if (simConfig.fillEvenIfEdgeLost) {
      return {
        filled: true,
        status: 'EDGE_LOST',
        originalEdge,
        finalEdge: Math.round(finalEdge * 100) / 100,
        originalLegs,
        finalLegs,
        latencyMs,
        slippageApplied,
      };
    } else {
      return {
        filled: false,
        status: 'EDGE_LOST',
        originalEdge,
        finalEdge: Math.round(finalEdge * 100) / 100,
        originalLegs,
        finalLegs,
        latencyMs,
        slippageApplied,
      };
    }
  }

  // Successful fill
  return {
    filled: true,
    status: 'OPEN',
    originalEdge,
    finalEdge: Math.round(finalEdge * 100) / 100,
    originalLegs,
    finalLegs,
    latencyMs,
    slippageApplied,
  };
}

/**
 * Synchronous version for quick checks (doesn't include actual latency wait)
 */
export function simulatePaperFillSync(
  opportunity: Opportunity,
  simConfig: PaperSimulationConfig = DEFAULT_PAPER_SIM_CONFIG,
  detectionConfig: DetectionConfig = DEFAULT_DETECTION_CONFIG
): Omit<PaperFillResult, 'latencyMs'> & { latencyMs: number } {
  const originalEdge = opportunity.edgePct;
  const originalLegs = opportunity.legs.map(leg => ({ ...leg }));

  // Calculate latency (but don't actually wait)
  const latencyMs = randomInRange(simConfig.latencyMsMin, simConfig.latencyMsMax);

  // Check for miss
  if (Math.random() < simConfig.missFillProb) {
    return {
      filled: false,
      status: 'MISSED',
      originalEdge,
      finalEdge: originalEdge,
      originalLegs,
      finalLegs: originalLegs,
      latencyMs,
      slippageApplied: [],
    };
  }

  // Apply slippage to each leg
  const slippageApplied: number[] = [];
  const finalLegs: OpportunityLeg[] = originalLegs.map(leg => {
    const slippageDecimal = simConfig.slippageBps / 10000;
    const slippageAmount = Math.max(leg.odds * slippageDecimal, 0.01);
    const cappedSlippage = Math.min(slippageAmount, simConfig.maxLegOddsWorsen);

    let newOdds = leg.odds - cappedSlippage;
    newOdds = Math.max(newOdds, 1.01);

    slippageApplied.push(leg.odds - newOdds);

    return {
      ...leg,
      odds: Math.round(newOdds * 100) / 100,
    };
  });

  const finalEdge = calculateEdge(finalLegs);

  if (finalEdge < detectionConfig.minEdge) {
    if (simConfig.fillEvenIfEdgeLost) {
      return {
        filled: true,
        status: 'EDGE_LOST',
        originalEdge,
        finalEdge: Math.round(finalEdge * 100) / 100,
        originalLegs,
        finalLegs,
        latencyMs,
        slippageApplied,
      };
    } else {
      return {
        filled: false,
        status: 'EDGE_LOST',
        originalEdge,
        finalEdge: Math.round(finalEdge * 100) / 100,
        originalLegs,
        finalLegs,
        latencyMs,
        slippageApplied,
      };
    }
  }

  return {
    filled: true,
    status: 'OPEN',
    originalEdge,
    finalEdge: Math.round(finalEdge * 100) / 100,
    originalLegs,
    finalLegs,
    latencyMs,
    slippageApplied,
  };
}

/**
 * Helper to generate random number in range
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate expected value of a paper fill attempt
 */
export function calculateExpectedFillRate(
  simConfig: PaperSimulationConfig = DEFAULT_PAPER_SIM_CONFIG
): number {
  // Base fill rate is 1 - miss probability
  const baseFillRate = 1 - simConfig.missFillProb;

  // Estimate how often edge will be lost due to slippage
  // This is approximate - actual rate depends on starting edge and odds
  const edgeLostEstimate = 0.15; // Rough estimate

  if (simConfig.fillEvenIfEdgeLost) {
    return baseFillRate;
  }

  return baseFillRate * (1 - edgeLostEstimate);
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: PaperFillResult['status']): string {
  switch (status) {
    case 'OPEN':
      return 'Position opened successfully';
    case 'MISSED':
      return 'Fill missed due to timing';
    case 'EDGE_LOST':
      return 'Edge lost due to odds movement';
    default:
      return 'Unknown status';
  }
}
