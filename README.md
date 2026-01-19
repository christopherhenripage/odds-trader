# Odds Trader

A complete arbitrage and middle betting opportunity scanner with real-time alerts and paper trading simulation.

## Architecture

```
odds-trader/
├── apps/
│   ├── web/          # Next.js 14 web app (Vercel)
│   └── worker/       # Node.js scanner worker (Fly.io/Railway/VPS)
├── packages/
│   └── shared/       # Shared types and detection logic
└── prisma/
    └── schema.prisma # Database schema
```

## Features

- **Arbitrage Detection**: Find guaranteed profit opportunities with 2-way and 3-way arbitrage
- **Middle Finder**: Detect totals and spread middles
- **Real-time Alerts**: Discord, Telegram, or Email notifications
- **Paper Trading**: Simulate trades with realistic latency and slippage
- **Dashboard**: Live opportunities table with filters
- **Stake Calculator**: Optimal stake sizing for guaranteed profits

## Tech Stack

- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, NextAuth
- **Worker**: Node.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Monorepo**: pnpm workspaces + Turborepo

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database (Neon, Supabase, or local)
- [The Odds API](https://the-odds-api.com) account

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd odds-trader
pnpm install
```

### 2. Set Up Environment Variables

**Web App** (`apps/web/.env.local`):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/odds_trader"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# Optional: Resend for emails
RESEND_API_KEY="your-resend-api-key"
```

**Worker** (`apps/worker/.env`):

```env
# Database (same as web)
DATABASE_URL="postgresql://user:password@localhost:5432/odds_trader"

# The Odds API
ODDS_API_KEY="your-odds-api-key"

# Scanner Config
SCAN_INTERVAL_MS="10000"
MARKETS="h2h,totals,spreads"
MIN_EDGE="0.5"
MIN_MIDDLE_WIDTH="0.5"

# Optional: Telegram
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# Optional: Resend
RESEND_API_KEY="your-resend-api-key"
```

### 3. Set Up Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (for development)
pnpm db:push

# Or run migrations (for production)
pnpm db:migrate
```

### 4. Run Locally

```bash
# Run both web and worker
pnpm dev

# Or run separately
pnpm --filter @odds-trader/web dev
pnpm --filter @odds-trader/worker dev
```

The web app will be at http://localhost:3000

## Configuration

### Scanner Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `SCAN_INTERVAL_MS` | 10000 | Polling interval in milliseconds |
| `SPORTS` | (all) | Comma-separated sport keys to scan |
| `MARKETS` | h2h,totals,spreads | Market types to scan |
| `MIN_EDGE` | 0.5 | Minimum edge percentage |
| `MIN_MIDDLE_WIDTH` | 0.5 | Minimum middle width in points |
| `STAKE_DEFAULT` | 100 | Default stake for calculations |
| `BUNDLE_WINDOW_MS` | 10000 | Bundling window for notifications |
| `DEDUPE_TTL_MS` | 180000 | Deduplication TTL (3 minutes) |

### Available Sports

The Odds API provides many sports. Common keys include:
- `americanfootball_nfl` - NFL
- `americanfootball_ncaaf` - NCAA Football
- `basketball_nba` - NBA
- `basketball_ncaab` - NCAA Basketball
- `baseball_mlb` - MLB
- `icehockey_nhl` - NHL
- `soccer_epl` - English Premier League
- `mma_mixed_martial_arts` - MMA/UFC

Set `SPORTS` to limit scanning: `SPORTS=americanfootball_nfl,basketball_nba`

## Deployment

### Web App (Vercel)

1. Connect your repo to Vercel
2. Set root directory to `apps/web`
3. Add environment variables in Vercel dashboard
4. Deploy

### Worker (Fly.io)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`

2. Login and create app:
```bash
fly auth login
cd apps/worker
fly apps create odds-trader-worker
```

3. Copy and configure fly.toml:
```bash
cp fly.toml.example fly.toml
# Edit fly.toml with your settings
```

4. Set secrets:
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set ODDS_API_KEY="your-key"
fly secrets set TELEGRAM_BOT_TOKEN="your-token"  # optional
fly secrets set RESEND_API_KEY="your-key"        # optional
```

5. Deploy:
```bash
fly deploy
```

### Worker (Railway/Render/VPS)

The worker is a simple Node.js app. Use the Dockerfile or run directly:

```bash
cd apps/worker
pnpm build
node dist/index.js
```

Set environment variables through your platform's dashboard.

## Paper Trading

Paper trading simulates real trades with:

- **Latency**: Random delay (400-2200ms default)
- **Slippage**: Odds worsen slightly (35 bps default)
- **Miss Rate**: 8% of fills are missed
- **Edge Loss**: Position may open with degraded edge

Configure per-user in Portfolio > Settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `latencyMsMin` | 400 | Minimum simulated latency |
| `latencyMsMax` | 2200 | Maximum simulated latency |
| `slippageBps` | 35 | Slippage in basis points |
| `missFillProb` | 0.08 | Probability of missed fill |
| `maxLegOddsWorsen` | 0.15 | Max odds decrease per leg |
| `fillEvenIfEdgeLost` | false | Fill even if edge goes negative |

## Notifications

### Discord

1. Create a webhook in your Discord server (Server Settings > Integrations > Webhooks)
2. Copy the webhook URL
3. Paste in Settings > Notifications

### Telegram

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Either:
   - Set `TELEGRAM_BOT_TOKEN` in worker env (shared bot)
   - Enter your own bot token in settings (private bot)
4. Enter chat ID in Settings > Notifications

### Email

1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Set `RESEND_API_KEY` in worker env
4. Select Email in Settings > Notifications

## API Endpoints

The web app exposes these server actions for data access:

- `getOpportunities(filter)` - Fetch filtered opportunities
- `getOpportunityStats()` - Dashboard statistics
- `getNotificationSettings()` - User notification config
- `updateNotificationSettings(data)` - Update notifications
- `sendTestNotification()` - Send test notification
- `getPaperAccount()` - Paper trading account
- `getPaperPositions()` - Paper positions list
- `closePosition(id, payout)` - Close paper position
- `getLatestHeartbeat()` - Worker health status

## Database Schema

Key models:

- **User**: NextAuth users
- **NotificationSetting**: Per-user notification preferences
- **Opportunity**: Detected arbitrage/middle opportunities
- **OpportunityDelivery**: Notification delivery tracking
- **PaperAccount**: User paper trading settings
- **PaperPosition**: Paper trading positions
- **WorkerHeartbeat**: Worker health monitoring

## Development

```bash
# Run type checking
pnpm lint

# Build all packages
pnpm build

# Open Prisma Studio
pnpm db:studio
```

## Environment Variables Summary

### Web App (Required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Your app URL |
| `NEXTAUTH_SECRET` | NextAuth encryption secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |

### Web App (Optional)

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Shared Telegram bot token |
| `RESEND_API_KEY` | Resend API key for emails |

### Worker (Required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ODDS_API_KEY` | The Odds API key |

### Worker (Optional)

| Variable | Description |
|----------|-------------|
| `SCAN_INTERVAL_MS` | Polling interval |
| `SPORTS` | Sports to scan (comma-separated) |
| `MARKETS` | Markets to scan |
| `MIN_EDGE` | Minimum edge percentage |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `RESEND_API_KEY` | Resend API key |

## License

MIT

## Disclaimer

This tool is for educational and research purposes only. Sports betting involves risk. Gamble responsibly.
