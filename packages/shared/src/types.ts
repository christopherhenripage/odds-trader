// ============================================
// Core Types for Odds Trader
// ============================================

export type OpportunityType = 'ARB' | 'MIDDLE';
export type MarketKey = 'h2h' | 'totals' | 'spreads';
export type NotificationChannel = 'DISCORD' | 'TELEGRAM' | 'EMAIL' | 'NONE';
export type PaperPositionStatus = 'OPEN' | 'CLOSED' | 'MISSED' | 'EDGE_LOST';
export type DeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED';

// ============================================
// Odds API Response Types
// ============================================

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

// ============================================
// Normalized Internal Types
// ============================================

export interface NormalizedOutcome {
  name: string;
  price: number;
  point?: number;
  bookmaker: string;
  bookmakerTitle: string;
}

export interface NormalizedMarket {
  key: MarketKey;
  outcomes: NormalizedOutcome[];
}

export interface NormalizedEvent {
  id: string;
  sportKey: string;
  sportTitle: string;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  markets: NormalizedMarket[];
}

// ============================================
// Opportunity Types
// ============================================

export interface OpportunityLeg {
  outcome: string;
  bookmaker: string;
  bookmakerTitle: string;
  odds: number;
  point?: number;
  stake?: number;
}

export interface Opportunity {
  id?: string;
  fingerprint: string;
  createdAt?: Date;
  eventId: string;
  sportKey: string;
  sportTitle?: string | null;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  type: OpportunityType;
  marketKey: MarketKey;
  edgePct: number;
  middleWidth?: number | null;
  legs: OpportunityLeg[];
  raw?: unknown;
}

export interface OpportunityWithStakes extends Opportunity {
  totalStake: number;
  guaranteedProfit: number;
}

// ============================================
// Detection Config
// ============================================

export interface DetectionConfig {
  minEdge: number;              // minimum edge percentage (default 0.5)
  minMiddleWidth: number;       // minimum points width for middles (default 0.5)
  stakeDefault: number;         // default total stake amount (default 100)
}

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  minEdge: 0.5,
  minMiddleWidth: 0.5,
  stakeDefault: 100,
};

// ============================================
// Paper Trading Types
// ============================================

export interface PaperSimulationConfig {
  latencyMsMin: number;         // default 400
  latencyMsMax: number;         // default 2200
  slippageBps: number;          // default 35 (basis points)
  missFillProb: number;         // default 0.08
  maxLegOddsWorsen: number;     // default 0.15
  fillEvenIfEdgeLost: boolean;  // default false
}

export const DEFAULT_PAPER_SIM_CONFIG: PaperSimulationConfig = {
  latencyMsMin: 400,
  latencyMsMax: 2200,
  slippageBps: 35,
  missFillProb: 0.08,
  maxLegOddsWorsen: 0.15,
  fillEvenIfEdgeLost: false,
};

export interface PaperFillResult {
  filled: boolean;
  status: PaperPositionStatus;
  originalEdge: number;
  finalEdge: number;
  originalLegs: OpportunityLeg[];
  finalLegs: OpportunityLeg[];
  latencyMs: number;
  slippageApplied: number[];
}

// ============================================
// Notification Types
// ============================================

export interface NotificationPayload {
  title: string;
  message: string;
  opportunity: Opportunity;
  stakes?: OpportunityLeg[];
  totalStake?: number;
  guaranteedProfit?: number;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

// ============================================
// Bundle Types
// ============================================

export interface BundledOpportunities {
  eventId: string;
  opportunities: Opportunity[];
  bestEdge: number;
}

// ============================================
// Dedupe Types
// ============================================

export interface DedupeEntry {
  fingerprint: string;
  timestamp: number;
}

// ============================================
// Worker Types
// ============================================

export interface WorkerConfig {
  intervalMs: number;           // polling interval in ms
  sports: string[] | 'all';     // sports to scan
  markets: MarketKey[];         // markets to scan
  detection: DetectionConfig;
  bundleWindowMs: number;       // bundling window (default 10000)
  maxPerEventBundle: number;    // max opportunities per event (default 5)
  dedupeTtlMs: number;          // dedup TTL in ms (default 180000)
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  intervalMs: 10000,
  sports: 'all',
  markets: ['h2h', 'totals', 'spreads'],
  detection: DEFAULT_DETECTION_CONFIG,
  bundleWindowMs: 10000,
  maxPerEventBundle: 5,
  dedupeTtlMs: 180000,
};

export interface HeartbeatData {
  lastScanAt: Date;
  polls: number;
  lastError?: string | null;
  apiCalls: number;
}
