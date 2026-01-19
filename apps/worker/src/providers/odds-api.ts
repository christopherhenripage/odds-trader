import {
  OddsApiSport,
  OddsApiEvent,
  NormalizedEvent,
  NormalizedMarket,
  NormalizedOutcome,
  MarketKey,
} from '@odds-trader/shared';

const BASE_URL = 'https://api.the-odds-api.com/v4';

interface OddsApiConfig {
  apiKey: string;
  regions?: string;
  oddsFormat?: string;
}

interface RateLimitState {
  remaining: number;
  used: number;
  lastUpdated: Date;
}

export class OddsApiProvider {
  private apiKey: string;
  private regions: string;
  private oddsFormat: string;
  private sportsCache: { data: OddsApiSport[]; timestamp: number } | null = null;
  private sportsCacheTtl = 10 * 60 * 1000; // 10 minutes
  private rateLimit: RateLimitState = {
    remaining: 500,
    used: 0,
    lastUpdated: new Date(),
  };
  public apiCalls = 0;

  constructor(config: OddsApiConfig) {
    this.apiKey = config.apiKey;
    this.regions = config.regions || 'us';
    this.oddsFormat = config.oddsFormat || 'decimal';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set('apiKey', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchWithBackoff(url.toString());

    // Update rate limit from headers
    const remaining = response.headers.get('x-requests-remaining');
    const used = response.headers.get('x-requests-used');

    if (remaining) this.rateLimit.remaining = parseInt(remaining, 10);
    if (used) this.rateLimit.used = parseInt(used, 10);
    this.rateLimit.lastUpdated = new Date();

    this.apiCalls++;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Odds API error: ${response.status} ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private async fetchWithBackoff(
    url: string,
    attempt = 1,
    maxAttempts = 5
  ): Promise<Response> {
    const response = await fetch(url);

    if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
      if (attempt >= maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts: ${response.status}`);
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Rate limited or server error. Backing off ${backoffMs}ms...`);
      await sleep(backoffMs);

      return this.fetchWithBackoff(url, attempt + 1, maxAttempts);
    }

    return response;
  }

  async getSports(): Promise<OddsApiSport[]> {
    // Check cache
    if (
      this.sportsCache &&
      Date.now() - this.sportsCache.timestamp < this.sportsCacheTtl
    ) {
      return this.sportsCache.data;
    }

    const sports = await this.fetch<OddsApiSport[]>('/sports');

    // Filter to active sports only
    const activeSports = sports.filter((s) => s.active);

    this.sportsCache = {
      data: activeSports,
      timestamp: Date.now(),
    };

    return activeSports;
  }

  async getOdds(
    sportKey: string,
    markets: MarketKey[] = ['h2h', 'totals', 'spreads']
  ): Promise<OddsApiEvent[]> {
    const events = await this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/odds`, {
      regions: this.regions,
      markets: markets.join(','),
      oddsFormat: this.oddsFormat,
    });

    return events;
  }

  normalizeEvents(events: OddsApiEvent[]): NormalizedEvent[] {
    return events.map((event) => this.normalizeEvent(event));
  }

  private normalizeEvent(event: OddsApiEvent): NormalizedEvent {
    const marketsMap = new Map<MarketKey, NormalizedOutcome[]>();

    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        const marketKey = market.key as MarketKey;
        const existing = marketsMap.get(marketKey) || [];

        for (const outcome of market.outcomes) {
          existing.push({
            name: outcome.name,
            price: outcome.price,
            point: outcome.point,
            bookmaker: bookmaker.key,
            bookmakerTitle: bookmaker.title,
          });
        }

        marketsMap.set(marketKey, existing);
      }
    }

    const markets: NormalizedMarket[] = Array.from(marketsMap.entries()).map(
      ([key, outcomes]) => ({
        key,
        outcomes,
      })
    );

    return {
      id: event.id,
      sportKey: event.sport_key,
      sportTitle: event.sport_title,
      commenceTime: new Date(event.commence_time),
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      markets,
    };
  }

  getRateLimitInfo(): RateLimitState {
    return { ...this.rateLimit };
  }

  resetApiCallCounter(): void {
    this.apiCalls = 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
