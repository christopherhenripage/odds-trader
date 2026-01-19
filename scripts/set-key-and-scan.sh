#!/bin/bash
# Usage: ./scripts/set-key-and-scan.sh YOUR_NEW_API_KEY

if [ -z "$1" ]; then
  echo "Usage: ./scripts/set-key-and-scan.sh YOUR_NEW_API_KEY"
  echo ""
  echo "To get a free API key:"
  echo "1. Go to https://the-odds-api.com"
  echo "2. Click 'Get API Key' (it's free)"
  echo "3. Sign up with any email"
  echo "4. Copy your API key"
  echo "5. Run: ./scripts/set-key-and-scan.sh YOUR_KEY"
  exit 1
fi

API_KEY=$1

# Update the .env file
cd "$(dirname "$0")/.." || exit
sed -i '' "s/ODDS_API_KEY=.*/ODDS_API_KEY=\"$API_KEY\"/" apps/worker/.env

echo "✓ API key updated in apps/worker/.env"
echo ""
echo "Running live scan..."
echo ""

# Run the scan
ODDS_API_KEY="$API_KEY" npx ts-node --esm scripts/scan-once.ts
