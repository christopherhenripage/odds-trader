import { Suspense } from 'react';
import { MatchedBetCalculator, FreeBetCalculator, OddsBoostCalculator } from '@/components/calculators';
import { Calculator, Gift, Zap, Info } from 'lucide-react';

export const metadata = {
  title: 'Calculators | Promo Profit Tracker',
  description: 'Free bet calculators, matched betting calculators, and odds boost calculators',
};

export default function CalculatorsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Calculators</h1>
        <p className="text-white/50 mt-1">
          Tools to calculate optimal stakes and extract maximum profit from promos
        </p>
      </div>

      {/* Quick Guide */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-neon-green/10 via-neon-cyan/10 to-neon-purple/10 border border-white/10">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-neon-cyan mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-white">How Matched Betting Works</h3>
            <p className="text-sm text-white/70 mt-1">
              1. Place a <strong>back bet</strong> at a bookmaker (e.g., Sportsbet) using their promo
              <br />
              2. Place a <strong>lay bet</strong> at Betfair (bet against the same outcome)
              <br />
              3. The two bets cancel out risk - you extract the promo value as guaranteed profit
            </p>
          </div>
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="grid gap-6">
        <MatchedBetCalculator />
        <FreeBetCalculator />
        <OddsBoostCalculator />
      </div>

      {/* Tips Section */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-neon-green" />
            <span className="text-sm font-semibold text-white">Qualifying Bets</span>
          </div>
          <p className="text-xs text-white/50">
            Use the Matched Bet calculator for your initial qualifying bet. Expect a small loss (~$2-5) which you'll make back with the free bet.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-neon-cyan" />
            <span className="text-sm font-semibold text-white">Free Bets</span>
          </div>
          <p className="text-xs text-white/50">
            Higher odds = higher retention. Look for odds between 3.0-6.0. Most free bets are SNR (Stake Not Returned).
          </p>
        </div>
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-neon-purple" />
            <span className="text-sm font-semibold text-white">Odds Boosts</span>
          </div>
          <p className="text-xs text-white/50">
            Anything above +5% EV is worth betting. Strong boosts (&gt;10% EV) should be max bet every time.
          </p>
        </div>
      </div>
    </div>
  );
}
