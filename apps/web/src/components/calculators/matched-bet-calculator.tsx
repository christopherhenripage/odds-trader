'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MatchedBetResult {
  layStake: number;
  backReturn: number;
  layLiability: number;
  profitIfBackWins: number;
  profitIfLayWins: number;
  qualifyingLoss: number;
}

export function MatchedBetCalculator() {
  const [backStake, setBackStake] = useState<string>('50');
  const [backOdds, setBackOdds] = useState<string>('2.00');
  const [layOdds, setLayOdds] = useState<string>('2.05');
  const [commission, setCommission] = useState<string>('5');
  const [result, setResult] = useState<MatchedBetResult | null>(null);

  useEffect(() => {
    const stake = parseFloat(backStake) || 0;
    const back = parseFloat(backOdds) || 0;
    const lay = parseFloat(layOdds) || 0;
    const comm = parseFloat(commission) || 0;

    if (stake > 0 && back > 0 && lay > 0) {
      // Calculate lay stake for balanced outcome
      const commissionMultiplier = 1 - comm / 100;
      const layStake = (stake * back) / (lay - comm / 100);

      // More accurate formula
      const layStakeExact = (stake * back) / (lay - (1 - commissionMultiplier));

      const backReturn = stake * back;
      const layLiability = layStakeExact * (lay - 1);

      // If back wins: get back return, lose lay liability
      const profitIfBackWins = backReturn - stake - layLiability;

      // If lay wins: lose back stake, win lay stake (minus commission)
      const profitIfLayWins = (layStakeExact * commissionMultiplier) - stake;

      // Qualifying loss is the worst outcome (usually very similar)
      const qualifyingLoss = Math.min(profitIfBackWins, profitIfLayWins);

      setResult({
        layStake: layStakeExact,
        backReturn,
        layLiability,
        profitIfBackWins,
        profitIfLayWins,
        qualifyingLoss,
      });
    } else {
      setResult(null);
    }
  }, [backStake, backOdds, layOdds, commission]);

  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-neon-green" />
          <CardTitle className="text-white">Matched Bet Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate lay stakes to lock in a qualifying bet with minimal loss
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-white/70">Back Stake ($)</Label>
            <Input
              type="number"
              value={backStake}
              onChange={(e) => setBackStake(e.target.value)}
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
              placeholder="2.00"
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
              placeholder="2.05"
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

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Main Result */}
            <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/20">
              <div className="text-sm text-neon-green/70 mb-1">Lay Stake at Betfair</div>
              <div className="text-3xl font-bold text-neon-green font-mono">
                ${result.layStake.toFixed(2)}
              </div>
              <div className="text-sm text-white/50 mt-1">
                Liability: ${result.layLiability.toFixed(2)}
              </div>
            </div>

            {/* Outcome Scenarios */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-white/70">If Back Wins</span>
                </div>
                <div className={`text-xl font-bold font-mono ${result.profitIfBackWins >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.profitIfBackWins >= 0 ? '+' : ''}{result.profitIfBackWins.toFixed(2)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-white/70">If Lay Wins</span>
                </div>
                <div className={`text-xl font-bold font-mono ${result.profitIfLayWins >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.profitIfLayWins >= 0 ? '+' : ''}{result.profitIfLayWins.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Qualifying Loss */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-amber-400">Qualifying Loss</span>
                </div>
                <span className="font-mono font-bold text-amber-400">
                  ${Math.abs(result.qualifyingLoss).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                This is normal - you'll make it back with the free bet
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-white/50 space-y-1">
          <p><strong className="text-white/70">How to use:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Place BACK bet at the bookmaker (e.g., Sportsbet)</li>
            <li>Place LAY bet at Betfair for the calculated stake</li>
            <li>Small qualifying loss is expected - free bet makes profit</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
