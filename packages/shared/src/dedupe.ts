import { createHash } from 'crypto';
import { OpportunityLeg, OpportunityType, MarketKey, DedupeEntry } from './types';

/**
 * Generate a unique fingerprint for an opportunity
 * Based on: eventId + market + type + sorted legs (outcome name + book + odds + point)
 */
export function generateFingerprint(
  eventId: string,
  marketKey: MarketKey,
  type: OpportunityType,
  legs: OpportunityLeg[]
): string {
  // Sort legs by outcome name, then by bookmaker for consistency
  const sortedLegs = [...legs].sort((a, b) => {
    const nameCompare = a.outcome.localeCompare(b.outcome);
    if (nameCompare !== 0) return nameCompare;
    return a.bookmaker.localeCompare(b.bookmaker);
  });

  // Create string representation
  const legStrings = sortedLegs.map(leg => {
    const point = leg.point !== undefined ? leg.point.toFixed(2) : 'null';
    return `${leg.outcome}|${leg.bookmaker}|${leg.odds.toFixed(2)}|${point}`;
  });

  const data = `${eventId}|${marketKey}|${type}|${legStrings.join('|')}`;

  // Generate SHA256 hash
  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * In-memory deduplication cache with TTL
 */
export class DedupeCache {
  private cache: Map<string, DedupeEntry> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 180000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Check if a fingerprint exists and is still valid
   */
  has(fingerprint: string): boolean {
    const entry = this.cache.get(fingerprint);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(fingerprint);
      return false;
    }

    return true;
  }

  /**
   * Add a fingerprint to the cache
   */
  add(fingerprint: string): void {
    this.cache.set(fingerprint, {
      fingerprint,
      timestamp: Date.now(),
    });
  }

  /**
   * Check and add in one operation
   * Returns true if the item was new (not a duplicate)
   */
  checkAndAdd(fingerprint: string): boolean {
    if (this.has(fingerprint)) {
      return false;
    }
    this.add(fingerprint);
    return true;
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Update TTL setting
   */
  setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }
}

/**
 * Create a stable fingerprint for database deduplication
 * This version doesn't include odds to allow detecting when the same opportunity
 * is still available with slightly different odds
 */
export function generateStableFingerprint(
  eventId: string,
  marketKey: MarketKey,
  type: OpportunityType,
  legs: OpportunityLeg[]
): string {
  // Sort legs by outcome name, then by bookmaker for consistency
  const sortedLegs = [...legs].sort((a, b) => {
    const nameCompare = a.outcome.localeCompare(b.outcome);
    if (nameCompare !== 0) return nameCompare;
    return a.bookmaker.localeCompare(b.bookmaker);
  });

  // Create string representation without odds
  const legStrings = sortedLegs.map(leg => {
    const point = leg.point !== undefined ? leg.point.toFixed(2) : 'null';
    return `${leg.outcome}|${leg.bookmaker}|${point}`;
  });

  const data = `${eventId}|${marketKey}|${type}|${legStrings.join('|')}`;

  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}
