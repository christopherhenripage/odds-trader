import 'dotenv/config';
import {
  detectArbitrages,
  detectMiddles,
  DedupeCache,
  OpportunityBuffer,
  flattenBundles,
  Opportunity,
  MarketKey,
  DEFAULT_DETECTION_CONFIG,
  DEFAULT_WORKER_CONFIG,
  simulatePaperFillSync,
  addStakesToOpportunity,
} from '@odds-trader/shared';
import { OddsApiProvider } from './providers/odds-api';
import {
  upsertOpportunity,
  getUsersWithNotifications,
  recordDelivery,
  hasDelivered,
  updateHeartbeat,
  getPaperAccountsWithAutoFill,
  getOpenPaperPositionCount,
  createPaperPosition,
  debitBankroll,
  disconnect,
} from './db';
import { sendNotification } from './notifications';

// Configuration from environment
const config = {
  intervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '10000', 10),
  sports: process.env.SPORTS ? process.env.SPORTS.split(',').map((s) => s.trim()) : ('all' as const),
  markets: (process.env.MARKETS || 'h2h,totals,spreads').split(',').map((m) => m.trim()) as MarketKey[],
  detection: {
    minEdge: parseFloat(process.env.MIN_EDGE || '0.5'),
    minMiddleWidth: parseFloat(process.env.MIN_MIDDLE_WIDTH || '0.5'),
    stakeDefault: parseFloat(process.env.STAKE_DEFAULT || '100'),
  },
  bundleWindowMs: parseInt(process.env.BUNDLE_WINDOW_MS || '10000', 10),
  maxPerEventBundle: parseInt(process.env.MAX_PER_EVENT_BUNDLE || '5', 10),
  dedupeTtlMs: parseInt(process.env.DEDUPE_TTL_MS || '180000', 10),
};

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.ODDS_API_KEY) {
  console.error('ERROR: ODDS_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize components
const oddsProvider = new OddsApiProvider({
  apiKey: process.env.ODDS_API_KEY,
  regions: process.env.ODDS_API_REGIONS || 'us',
});

const dedupeCache = new DedupeCache(config.dedupeTtlMs);
const opportunityBuffer = new OpportunityBuffer(config.bundleWindowMs);

// State
let pollCount = 0;
let lastError: string | null = null;
let isRunning = true;

async function scanSport(sportKey: string): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  try {
    const events = await oddsProvider.getOdds(sportKey, config.markets);
    const normalizedEvents = oddsProvider.normalizeEvents(events);

    for (const event of normalizedEvents) {
      // Detect arbitrages
      const arbs = detectArbitrages(event, config.detection);
      opportunities.push(...arbs);

      // Detect middles
      const middles = detectMiddles(event, config.detection);
      opportunities.push(...middles);
    }
  } catch (error) {
    console.error(`Error scanning ${sportKey}:`, error);
    throw error;
  }

  return opportunities;
}

async function processOpportunities(opportunities: Opportunity[]): Promise<void> {
  // Filter out duplicates using in-memory cache
  const newOpportunities = opportunities.filter((opp) =>
    dedupeCache.checkAndAdd(opp.fingerprint)
  );

  if (newOpportunities.length === 0) {
    return;
  }

  console.log(`Found ${newOpportunities.length} new opportunities`);

  // Store in database
  const opportunityIds: Map<string, string> = new Map();
  for (const opp of newOpportunities) {
    const id = await upsertOpportunity(opp);
    opportunityIds.set(opp.fingerprint, id);
  }

  // Get users with notifications enabled
  const users = await getUsersWithNotifications();

  // Send notifications
  for (const opp of newOpportunities) {
    const oppId = opportunityIds.get(opp.fingerprint)!;

    for (const user of users) {
      // Check if already delivered
      const delivered = await hasDelivered(oppId, user.userId);
      if (delivered) continue;

      // Send notification
      const result = await sendNotification(opp, user, config.detection.stakeDefault);

      // Record delivery
      await recordDelivery(
        oppId,
        user.userId,
        result.success ? 'SENT' : 'FAILED',
        user.channel,
        result.error
      );

      if (result.success) {
        console.log(`Sent ${opp.type} notification to user ${user.userId} via ${user.channel}`);
      } else {
        console.error(`Failed to send to ${user.userId}: ${result.error}`);
      }
    }
  }

  // Process paper trading auto-fills
  await processPaperFills(newOpportunities);
}

async function processPaperFills(opportunities: Opportunity[]): Promise<void> {
  const accounts = await getPaperAccountsWithAutoFill();

  for (const account of accounts) {
    // Check if user has reached max open positions
    const openCount = await getOpenPaperPositionCount(account.userId);
    if (openCount >= account.maxOpen) continue;

    // Try to fill one position per scan for this user
    for (const opp of opportunities) {
      // Only try ARBs for paper trading (more reliable)
      if (opp.type !== 'ARB') continue;
      if (opp.edgePct < config.detection.minEdge) continue;

      // Check bankroll
      const stakeTotal = config.detection.stakeDefault;
      if (account.bankroll < stakeTotal) continue;

      // Simulate fill
      const simResult = simulatePaperFillSync(
        opp,
        {
          latencyMsMin: account.latencyMsMin,
          latencyMsMax: account.latencyMsMax,
          slippageBps: account.slippageBps,
          missFillProb: account.missFillProb,
          maxLegOddsWorsen: account.maxLegOddsWorsen,
          fillEvenIfEdgeLost: account.fillEvenIfEdgeLost,
        },
        config.detection
      );

      const summary = `${opp.homeTeam} vs ${opp.awayTeam} - ${opp.marketKey}`;

      if (simResult.filled) {
        // Create position
        await createPaperPosition({
          userId: account.userId,
          type: opp.type,
          eventId: opp.eventId,
          summary,
          stakeTotal,
          edgePct: simResult.finalEdge,
          status: simResult.status === 'EDGE_LOST' ? 'EDGE_LOST' : 'OPEN',
          legs: simResult.finalLegs,
          latencyMs: simResult.latencyMs,
          slippageApplied: simResult.slippageApplied,
        });

        // Debit bankroll
        await debitBankroll(account.userId, stakeTotal);

        console.log(
          `Paper fill for user ${account.userId}: ${summary} (${simResult.status}, edge: ${simResult.finalEdge.toFixed(2)}%)`
        );

        // Only one fill per user per scan
        break;
      } else {
        // Record missed/edge-lost attempt without debiting
        if (simResult.status === 'MISSED' || simResult.status === 'EDGE_LOST') {
          await createPaperPosition({
            userId: account.userId,
            type: opp.type,
            eventId: opp.eventId,
            summary,
            stakeTotal: 0,
            edgePct: simResult.originalEdge,
            status: simResult.status,
            legs: simResult.originalLegs,
            latencyMs: simResult.latencyMs,
            slippageApplied: [],
          });
        }
      }
    }
  }
}

async function runPoll(): Promise<void> {
  pollCount++;
  console.log(`\n=== Poll #${pollCount} at ${new Date().toISOString()} ===`);

  try {
    // Get sports list
    const allSports = await oddsProvider.getSports();
    // Filter out outright/futures markets (they don't support spreads/totals)
    const sportsToScan =
      config.sports === 'all'
        ? allSports.map((s) => s.key).filter((k) => !k.includes('_winner'))
        : config.sports.filter((s) => allSports.some((as) => as.key === s));

    console.log(`Scanning ${sportsToScan.length} sports...`);

    // Scan each sport
    const allOpportunities: Opportunity[] = [];

    for (const sportKey of sportsToScan) {
      try {
        const opps = await scanSport(sportKey);
        allOpportunities.push(...opps);
        console.log(`  ${sportKey}: ${opps.length} opportunities`);
      } catch (error) {
        console.error(`  ${sportKey}: ERROR -`, error);
        // Continue with other sports
      }
    }

    // Add to buffer
    opportunityBuffer.add(allOpportunities);

    // Check if we should flush the buffer
    if (opportunityBuffer.shouldFlush()) {
      const bundles = opportunityBuffer.flush(config.maxPerEventBundle);
      const flattened = flattenBundles(bundles);

      if (flattened.length > 0) {
        console.log(`Processing ${flattened.length} bundled opportunities...`);
        await processOpportunities(flattened);
      }
    }

    lastError = null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Poll error:', errorMsg);
    lastError = errorMsg;
  }

  // Update heartbeat every minute (every 6 polls at 10s interval)
  if (pollCount % 6 === 0) {
    try {
      await updateHeartbeat({
        lastScanAt: new Date(),
        polls: pollCount,
        lastError,
        apiCalls: oddsProvider.apiCalls,
      });
      console.log('Heartbeat updated');
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }

  // Cleanup dedupe cache periodically
  if (pollCount % 60 === 0) {
    dedupeCache.cleanup();
    console.log(`Dedupe cache cleaned. Size: ${dedupeCache.size()}`);
  }
}

async function main(): Promise<void> {
  console.log('=================================================');
  console.log('         ODDS TRADER WORKER STARTING');
  console.log('=================================================');
  console.log(`Scan interval: ${config.intervalMs}ms`);
  console.log(`Sports: ${config.sports === 'all' ? 'ALL' : config.sports.join(', ')}`);
  console.log(`Markets: ${config.markets.join(', ')}`);
  console.log(`Min edge: ${config.detection.minEdge}%`);
  console.log(`Min middle width: ${config.detection.minMiddleWidth}`);
  console.log(`Default stake: $${config.detection.stakeDefault}`);
  console.log('=================================================\n');

  // Initial heartbeat
  await updateHeartbeat({
    lastScanAt: new Date(),
    polls: 0,
    lastError: null,
    apiCalls: 0,
  });

  // Main loop
  while (isRunning) {
    await runPoll();
    await sleep(config.intervalMs);
  }

  console.log('Worker shutting down...');
  await disconnect();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  isRunning = false;
});

// Start
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
