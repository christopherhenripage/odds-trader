'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Gift, ArrowRight, Percent } from 'lucide-react';

interface FreeBetResult {
  layStake: number;
  layLiability: number;
  profitIfBackWins: number;
  profitIfLayWins: number;
  guaranteedProfit: number;
  retention: number;
}

export function FreeBetCalculator() {
  const [freeBetStake, setFreeBetStake] = useState<string>('50');
  const [backOdds, setBackOdds] = useState<string>('3.00');
  const [layOdds, setLayOdds] = useState<string>('3.10');
  const [commission, setCommission] = useState<string>('5');
  const [stakeReturned, setStakeReturned] = useState(false); // SNR (Stake Not Returned) vs SR
  const [result, setResult] = useState<FreeBetResult | null>(null);

  useEffect(() => {
    const stake = parseFloat(freeBetStake) || 0;
    const back = parseFloat(backOdds) || 0;
    const lay = parseFloat(layOdds) || 0;
    const comm = parseFloat(commission) || 0;

    if (stake > 0 && back > 0 && lay > 0) {
      const commissionMultiplier = 1 - comm / 100;

      // For SNR (Stake Not Returned) free bets - most common
      // Back return = stake * (odds - 1) because you don't get stake back
      // For SR (Stake Returned) free bets
      // Back return = stake * odds

      const backProfit = stakeReturned ? stake * back : stake * (back - 1);

      // Calculate optimal lay stake
      const layStake = backProfit / (lay - (1 - commissionMultiplier));

      const layLiability = layStake * (lay - 1);

      // If free bet wins: get back profit, lose lay liability
      const profitIfBackWins = backProfit - layLiability;

      // If lay wins: lose nothing (free bet), win lay stake (minus commission)
      const profitIfLayWins = layStake * commissionMultiplier;

      // These should be roughly equal with optimal lay stake
      const guaranteedProfit = Math.min(profitIfBackWins, profitIfLayWins);
      const retention = (guaranteedProfit / stake) * 100;

      setResult({
        layStake,
        layLiability,
        profitIfBackWins,
        profitIfLayWins,
        guaranteedProfit,
        retention,
      });
    } else {
      setResult(null);
    }
  }, [freeBetStake, backOdds, layOdds, commission, stakeReturned]);

  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-neon-cyan" />
          <CardTitle className="text-white">Free Bet Calculator</CardTitle>
        </div>
        <CardDescription>
          Extract guaranteed profit from free bets and bonus bets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-white/70">Free Bet Value ($)</Label>
            <Input
              type="number"
              value={freeBetStake}
              onChange={(e) => setFreeBetStake(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Back Odds</Label>
            <Input
              type="number"
              step="0.01"
              value={backOdds}
              onChange={(e) => setBackOdds(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="3.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Lay Odds</Label>
            <Input
              type="number"
              step="0.01"
              value={layOdds}
              onChange={(e) => setLayOdds(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="3.10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Commission (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="5"
            />
          </div>
        </div>

        {/* Stake Returned Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div>
            <Label className="text-white/70">Stake Returned (SR)?</Label>
            <p className="text-xs text-white/40 mt-1">
              Most free bets are SNR (stake NOT returned). Check your terms.
            </p>
          </div>
          <Switch
            checked={stakeReturned}
            onCheckedChange={setStakeReturned}
          />
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Main Result */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-emerald-400/70 mb-1">Guaranteed Profit</div>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">
                    ${result.guaranteedProfit.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Percent className="h-4 w-4" />
                    <span className="text-2xl font-bold font-mono">{result.retention.toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-white/50">retention</div>
                </div>
              </div>
            </div>

            {/* Lay Stake */}
            <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
              <div className="text-sm text-neon-cyan/70 mb-1">Lay Stake at Betfair</div>
              <div className="text-2xl font-bold text-neon-cyan font-mono">
                ${result.layStake.toFixed(2)}
              </div>
              <div className="text-sm text-white/50 mt-1">
                Liability: ${result.layLiability.toFixed(2)}
              </div>
            </div>

            {/* Outcome Scenarios */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm text-white/70 mb-1">If Free Bet Wins</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  +${result.profitIfBackWins.toFixed(2)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm text-white/70 mb-1">If Lay Wins</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  +${result.profitIfLayWins.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                <strong>Tip:</strong> Higher odds = higher profit. Look for odds around 3.0-6.0 for best balance of profit and availability.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-white/50 space-y-1">
          <p><strong className="text-white/70">How to use:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Find a market with close back/lay odds (e.g., tennis, basketball)</li>
            <li>Place FREE BET at the bookmaker</li>
            <li>Place LAY bet at Betfair for the calculated stake</li>
            <li>Profit regardless of outcome!</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
