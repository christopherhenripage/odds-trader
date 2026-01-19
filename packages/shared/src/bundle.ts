import { Opportunity, BundledOpportunities } from './types';

/**
 * Bundle opportunities by event
 * Groups opportunities by eventId and keeps the best N by edge
 */
export function bundleByEvent(
  opportunities: Opportunity[],
  maxPerEvent: number = 5
): BundledOpportunities[] {
  // Group by eventId
  const byEvent = new Map<string, Opportunity[]>();

  for (const opp of opportunities) {
    const existing = byEvent.get(opp.eventId) || [];
    existing.push(opp);
    byEvent.set(opp.eventId, existing);
  }

  // Create bundles, sorted by edge and limited
  const bundles: BundledOpportunities[] = [];

  for (const [eventId, opps] of byEvent) {
    // Sort by edge descending (best first)
    const sorted = [...opps].sort((a, b) => b.edgePct - a.edgePct);

    // Take top N
    const limited = sorted.slice(0, maxPerEvent);

    bundles.push({
      eventId,
      opportunities: limited,
      bestEdge: limited[0]?.edgePct || 0,
    });
  }

  // Sort bundles by best edge descending
  return bundles.sort((a, b) => b.bestEdge - a.bestEdge);
}

/**
 * Accumulator for buffering opportunities over a time window
 */
export class OpportunityBuffer {
  private buffer: Opportunity[] = [];
  private windowMs: number;
  private lastFlush: number = Date.now();

  constructor(windowMs: number = 10000) {
    this.windowMs = windowMs;
  }

  /**
   * Add opportunities to the buffer
   */
  add(opportunities: Opportunity[]): void {
    this.buffer.push(...opportunities);
  }

  /**
   * Check if the buffer should be flushed
   */
  shouldFlush(): boolean {
    return Date.now() - this.lastFlush >= this.windowMs;
  }

  /**
   * Flush the buffer and return bundled opportunities
   */
  flush(maxPerEvent: number = 5): BundledOpportunities[] {
    const bundles = bundleByEvent(this.buffer, maxPerEvent);
    this.buffer = [];
    this.lastFlush = Date.now();
    return bundles;
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Peek at buffer contents without flushing
   */
  peek(): Opportunity[] {
    return [...this.buffer];
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = [];
    this.lastFlush = Date.now();
  }

  /**
   * Update window setting
   */
  setWindow(windowMs: number): void {
    this.windowMs = windowMs;
  }
}

/**
 * Flatten bundled opportunities back to a list
 */
export function flattenBundles(bundles: BundledOpportunities[]): Opportunity[] {
  return bundles.flatMap(bundle => bundle.opportunities);
}

/**
 * Get summary statistics for a bundle
 */
export function getBundleStats(bundle: BundledOpportunities): {
  count: number;
  bestEdge: number;
  avgEdge: number;
  arbCount: number;
  middleCount: number;
} {
  const opps = bundle.opportunities;
  const arbCount = opps.filter(o => o.type === 'ARB').length;
  const middleCount = opps.filter(o => o.type === 'MIDDLE').length;
  const avgEdge = opps.length > 0
    ? opps.reduce((sum, o) => sum + o.edgePct, 0) / opps.length
    : 0;

  return {
    count: opps.length,
    bestEdge: bundle.bestEdge,
    avgEdge: Math.round(avgEdge * 100) / 100,
    arbCount,
    middleCount,
  };
}
