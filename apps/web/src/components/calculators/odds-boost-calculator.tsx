'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface OddsBoostResult {
  expectedValue: number;
  evPercentage: number;
  impliedProbOriginal: number;
  impliedProbBoosted: number;
  edge: number;
  recommendation: 'strong' | 'good' | 'marginal' | 'skip';
  layStake: number;
  layLiability: number;
  guaranteedProfit: number;
}

export function OddsBoostCalculator() {
  const [stake, setStake] = useState<string>('25');
  const [originalOdds, setOriginalOdds] = useState<string>('2.00');
  const [boostedOdds, setBoostedOdds] = useState<string>('2.50');
  const [layOdds, setLayOdds] = useState<string>('2.05');
  const [commission, setCommission] = useState<string>('5');
  const [maxStake, setMaxStake] = useState<string>('25');
  const [result, setResult] = useState<OddsBoostResult | null>(null);

  useEffect(() => {
    const stakeVal = parseFloat(stake) || 0;
    const original = parseFloat(originalOdds) || 0;
    const boosted = parseFloat(boostedOdds) || 0;
    const lay = parseFloat(layOdds) || 0;
    const comm = parseFloat(commission) || 0;

    if (stakeVal > 0 && original > 0 && boosted > 0) {
      // Calculate implied probabilities
      const impliedProbOriginal = (1 / original) * 100;
      const impliedProbBoosted = (1 / boosted) * 100;

      // Edge is the difference in implied probability
      const edge = impliedProbOriginal - impliedProbBoosted;

      // Expected value calculation
      // EV = (probability of winning * profit) - (probability of losing * stake)
      // Using original odds as "true" probability
      const probWin = 1 / original;
      const profitIfWin = stakeVal * (boosted - 1);
      const lossIfLose = stakeVal;
      const expectedValue = (probWin * profitIfWin) - ((1 - probWin) * lossIfLose);
      const evPercentage = (expectedValue / stakeVal) * 100;

      // Determine recommendation
      let recommendation: 'strong' | 'good' | 'marginal' | 'skip';
      if (evPercentage >= 10) recommendation = 'strong';
      else if (evPercentage >= 5) recommendation = 'good';
      else if (evPercentage >= 2) recommendation = 'marginal';
      else recommendation = 'skip';

      // Calculate lay option for guaranteed profit
      let layStake = 0;
      let layLiability = 0;
      let guaranteedProfit = 0;

      if (lay > 0) {
        const commissionMultiplier = 1 - comm / 100;
        layStake = (stakeVal * boosted) / (lay - (1 - commissionMultiplier));
        layLiability = layStake * (lay - 1);

        const profitIfBackWins = (stakeVal * boosted) - stakeVal - layLiability;
        const profitIfLayWins = (layStake * commissionMultiplier) - stakeVal;
        guaranteedProfit = Math.min(profitIfBackWins, profitIfLayWins);
      }

      setResult({
        expectedValue,
        evPercentage,
        impliedProbOriginal,
        impliedProbBoosted,
        edge,
        recommendation,
        layStake,
        layLiability,
        guaranteedProfit,
      });
    } else {
      setResult(null);
    }
  }, [stake, originalOdds, boostedOdds, layOdds, commission, maxStake]);

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'good': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'marginal': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'skip': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return '';
    }
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'strong': return 'Strong +EV - Bet Max!';
      case 'good': return 'Good Value - Worth Betting';
      case 'marginal': return 'Marginal - Optional';
      case 'skip': return 'Skip This One';
      default: return '';
    }
  };

  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-neon-purple" />
          <CardTitle className="text-white">Odds Boost Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate the expected value of profit boosts and enhanced odds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-white/70">Your Stake ($)</Label>
            <Input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="25"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Original Odds</Label>
            <Input
              type="number"
              step="0.01"
              value={originalOdds}
              onChange={(e) => setOriginalOdds(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="2.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Boosted Odds</Label>
            <Input
              type="number"
              step="0.01"
              value={boostedOdds}
              onChange={(e) => setBoostedOdds(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="2.50"
            />
          </div>
        </div>

        {/* Optional Lay Section */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-white/70 mb-3">
            <strong>Optional:</strong> Lock in guaranteed profit with a lay bet
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/50 text-xs">Lay Odds (Betfair)</Label>
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
              <Label className="text-white/50 text-xs">Commission (%)</Label>
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
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Recommendation Badge */}
            <div className={`p-4 rounded-lg border ${getRecommendationColor(result.recommendation)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.recommendation === 'strong' || result.recommendation === 'good' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="font-semibold">{getRecommendationText(result.recommendation)}</span>
                </div>
                <Badge variant="outline" className={getRecommendationColor(result.recommendation)}>
                  {result.evPercentage >= 0 ? '+' : ''}{result.evPercentage.toFixed(1)}% EV
                </Badge>
              </div>
            </div>

            {/* EV Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                <div className="text-sm text-neon-purple/70 mb-1">Expected Value</div>
                <div className={`text-2xl font-bold font-mono ${result.expectedValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.expectedValue >= 0 ? '+' : ''}${result.expectedValue.toFixed(2)}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  per bet on average
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm text-white/70 mb-1">Boost Value</div>
                <div className="text-2xl font-bold font-mono text-neon-purple">
                  +{result.edge.toFixed(1)}%
                </div>
                <div className="text-xs text-white/50 mt-1">
                  edge vs original odds
                </div>
              </div>
            </div>

            {/* Guaranteed Profit Option */}
            {result.layStake > 0 && result.guaranteedProfit > 0 && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-semibold">Lock In Guaranteed Profit</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/50">Lay Stake</div>
                    <div className="text-lg font-mono text-white">${result.layStake.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Guaranteed Profit</div>
                    <div className="text-lg font-mono text-emerald-400">+${result.guaranteedProfit.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Probability Comparison */}
            <div className="text-xs text-white/50">
              <p>Original implied probability: {result.impliedProbOriginal.toFixed(1)}%</p>
              <p>Boosted implied probability: {result.impliedProbBoosted.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-white/50 space-y-1">
          <p><strong className="text-white/70">How to use:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Enter the original odds and the boosted odds from the promo</li>
            <li>Check if it's +EV (positive expected value)</li>
            <li>Optionally enter lay odds to lock in guaranteed profit</li>
            <li>Strong +EV boosts (&gt;10%) are worth max betting</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
