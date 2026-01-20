#!/bin/bash
# Usage: ./scripts/set-key-and-scan.sh YOUR_NEW_API_KEY [REGION]
# Regions: us, au, uk, eu (default: us)

if [ -z "$1" ]; then
  echo "Usage: ./scripts/set-key-and-scan.sh YOUR_NEW_API_KEY [REGION]"
  echo ""
  echo "Regions:"
  echo "  us - United States (DraftKings, FanDuel, BetMGM, Caesars)"
  echo "  au - Australia (TAB, Sportsbet, Ladbrokes, Neds, PointsBet)"
  echo "  nz - New Zealand (Uses AU bookmakers - TAB NZ, Sportsbet, Ladbrokes)"
  echo "  uk - United Kingdom (Bet365, William Hill, Paddy Power)"
  echo "  eu - Europe (Pinnacle, Unibet, 888sport)"
  echo ""
  echo "To get a free API key:"
  echo "1. Go to https://the-odds-api.com"
  echo "2. Click 'Get API Key' (it's free)"
  echo "3. Sign up with any email"
  echo "4. Copy your API key"
  echo "5. Run: ./scripts/set-key-and-scan.sh YOUR_KEY au"
  exit 1
fi

API_KEY=$1
REGION=${2:-us}

# Update the .env file
cd "$(dirname "$0")/.." || exit
sed -i '' "s/ODDS_API_KEY=.*/ODDS_API_KEY=\"$API_KEY\"/" apps/worker/.env

echo "✓ API key updated in apps/worker/.env"
echo "✓ Region: $REGION"
echo ""
echo "Running live scan..."
echo ""

# Run the scan with region
ODDS_API_KEY="$API_KEY" npx ts-node --esm scripts/scan-once.ts "$REGION"
