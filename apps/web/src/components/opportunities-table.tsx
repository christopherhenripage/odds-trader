'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getOpportunities, type OpportunityFilter } from '@/lib/actions/opportunities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDate, formatPercent, formatOdds, formatCurrency } from '@/lib/utils';
import { ExternalLink, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, Dice5 } from 'lucide-react';
import { OpportunityType } from '@prisma/client';

type SortColumn = 'type' | 'event' | 'market' | 'edge' | 'width' | 'time';
type SortDirection = 'asc' | 'desc';
import { addStakesToOpportunity, Opportunity as SharedOpportunity, MarketKey } from '@odds-trader/shared';

// Calculate risk/reward for middle bets
function calculateMiddleRiskReward(legs: OpportunityLeg[], totalStake: number = 100) {
  if (legs.length !== 2) return null;

  const stakePerLeg = totalStake / 2;
  const payout1 = stakePerLeg * legs[0].odds;
  const payout2 = stakePerLeg * legs[1].odds;

  // If middle misses: one wins, one loses
  const payoutIfMiss = Math.max(payout1, payout2);
  const risk = totalStake - payoutIfMiss;

  // If middle hits: both win
  const payoutIfHit = payout1 + payout2;
  const reward = payoutIfHit - totalStake;

  return { risk: Math.round(risk * 100) / 100, reward: Math.round(reward * 100) / 100 };
}

interface OpportunityLeg {
  outcome: string;
  bookmaker: string;
  bookmakerTitle: string;
  odds: number;
  point?: number;
  stake?: number;
}

interface Opportunity {
  id: string;
  fingerprint: string;
  createdAt: Date;
  eventId: string;
  sportKey: string;
  sportTitle: string | null;
  commenceTime: Date;
  homeTeam: string;
  awayTeam: string;
  type: OpportunityType;
  marketKey: string;
  edgePct: number;
  middleWidth: number | null;
  legs: OpportunityLeg[];
}

export function OpportunitiesTable() {
  const searchParams = useSearchParams();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [sortColumn, setSortColumn] = useState<SortColumn>('edge');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      const sport = searchParams.get('sport');
      const market = searchParams.get('market');
      const type = searchParams.get('type');
      const minEdge = searchParams.get('minEdge');
      const minWidth = searchParams.get('minWidth');

      if (sport && sport !== 'all') params.set('sport', sport);
      if (market && market !== 'all') params.set('market', market);
      if (type && type !== 'all') params.set('type', type);
      if (minEdge) params.set('minEdge', minEdge);
      if (minWidth) params.set('minWidth', minWidth);

      const response = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await response.json();

      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchOpportunities, 15000);
    return () => clearInterval(interval);
  }, [fetchOpportunities]);

  const getTypeVariant = (type: OpportunityType) => {
    return type === 'ARB' ? 'arb' : 'middle';
  };

  const getTypeLabel = (type: OpportunityType) => {
    return type === 'ARB' ? 'GUARANTEED' : 'SPECULATIVE';
  };

  const renderValueColumn = (opp: Opportunity) => {
    if (opp.type === 'ARB') {
      return (
        <span className="text-emerald-400">
          +{formatPercent(opp.edgePct)} profit
        </span>
      );
    } else {
      const riskReward = calculateMiddleRiskReward(opp.legs);
      if (riskReward) {
        return (
          <span className="text-amber-400">
            -${Math.abs(riskReward.risk).toFixed(0)} / +${riskReward.reward.toFixed(0)}
          </span>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    }
  };

  const getMarketLabel = (market: string) => {
    switch (market) {
      case 'h2h':
        return 'Moneyline';
      case 'h2h_3way':
        return 'Moneyline (3-Way)';
      case 'totals':
        return 'Totals';
      case 'spreads':
        return 'Spreads';
      default:
        return market;
    }
  };

  const getSportLabel = (sport: string) => {
    const labels: Record<string, string> = {
      'basketball_nba': 'NBA Basketball',
      'icehockey_nhl': 'NHL Hockey',
      'americanfootball_nfl': 'NFL Football',
      'baseball_mlb': 'MLB Baseball',
      'aussierules_afl': 'AFL Football',
      'rugbyleague_nrl': 'NRL Rugby',
      'soccer_epl': 'Premier League',
      'soccer_uefa_champs_league': 'Champions League',
      'tennis_atp_aus_open': 'Australian Open',
      'basketball_euroleague': 'Euroleague',
    };
    return labels[sport] || sport;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'edge' || column === 'width' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-neon-green" />
      : <ArrowDown className="ml-1 h-3 w-3 text-neon-green" />;
  };

  // Helper to get sortable value for an opportunity
  const getSortValue = (opp: Opportunity): number => {
    // For ARBs, use edgePct; for MIDDLEs, use middleWidth
    if (opp.type === 'ARB') {
      return opp.edgePct;
    } else {
      return opp.middleWidth || 0;
    }
  };

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'type':
        // Sort ARBs first (guaranteed), then MIDDLEs (speculative)
        comparison = a.type === 'ARB' && b.type !== 'ARB' ? -1 :
                     a.type !== 'ARB' && b.type === 'ARB' ? 1 :
                     a.type.localeCompare(b.type);
        break;
      case 'event':
        comparison = `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`);
        break;
      case 'market':
        comparison = a.marketKey.localeCompare(b.marketKey);
        break;
      case 'edge':
        // Sort by value: edgePct for ARBs, middleWidth for MIDDLEs
        // ARBs always come first when sorting by value
        if (a.type === 'ARB' && b.type !== 'ARB') {
          comparison = 1; // ARBs have higher "value"
        } else if (a.type !== 'ARB' && b.type === 'ARB') {
          comparison = -1;
        } else {
          comparison = getSortValue(a) - getSortValue(b);
        }
        break;
      case 'width':
        comparison = (a.middleWidth || 0) - (b.middleWidth || 0);
        break;
      case 'time':
        comparison = new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading && opportunities.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
        <p>No opportunities found matching your filters.</p>
        <p className="text-sm">Try adjusting your filter settings.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchOpportunities}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead
                className="cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center">
                  Type {getSortIcon('type')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('event')}
              >
                <div className="flex items-center">
                  Event {getSortIcon('event')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('market')}
              >
                <div className="flex items-center">
                  Market {getSortIcon('market')}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('edge')}
              >
                <div className="flex items-center justify-end">
                  Value {getSortIcon('edge')}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('width')}
              >
                <div className="flex items-center justify-end">
                  Window {getSortIcon('width')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center">
                  Time {getSortIcon('time')}
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOpportunities.map((opp) => (
              <TableRow
                key={opp.id}
                className="cursor-pointer"
                onClick={() => setSelectedOpp(opp)}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getTypeVariant(opp.type)} className="w-fit">
                      {opp.type === 'ARB' ? (
                        <><ShieldCheck className="h-3 w-3 mr-1" /> ARB</>
                      ) : (
                        <><Dice5 className="h-3 w-3 mr-1" /> MIDDLE</>
                      )}
                    </Badge>
                    <span className={`text-[10px] ${opp.type === 'ARB' ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                      {getTypeLabel(opp.type)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {opp.homeTeam} vs {opp.awayTeam}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSportLabel(opp.sportKey)}
                  </div>
                </TableCell>
                <TableCell>{getMarketLabel(opp.marketKey)}</TableCell>
                <TableCell className="text-right font-mono">
                  {renderValueColumn(opp)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {opp.type === 'MIDDLE' && opp.middleWidth ? (
                    <span className="text-cyan-400">{opp.middleWidth.toFixed(1)} pts</span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(opp.commenceTime)}
                </TableCell>
                <TableCell>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Opportunity Details Dialog */}
      <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
        <DialogContent className="max-w-2xl">
          {selectedOpp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant={getTypeVariant(selectedOpp.type)}>
                    {selectedOpp.type}
                  </Badge>
                  {selectedOpp.homeTeam} vs {selectedOpp.awayTeam}
                </DialogTitle>
                <DialogDescription>
                  {selectedOpp.sportKey} - {getMarketLabel(selectedOpp.marketKey)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Type Explanation Banner */}
                {selectedOpp.type === 'ARB' ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="font-semibold">Guaranteed Profit</span>
                    </div>
                    <p className="text-sm text-emerald-400/70 mt-1">
                      This is an arbitrage opportunity. You profit regardless of the outcome.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Dice5 className="h-4 w-4" />
                      <span className="font-semibold">Speculative Bet</span>
                    </div>
                    <p className="text-sm text-amber-400/70 mt-1">
                      This is a middle bet. You have a small guaranteed loss UNLESS the final score lands in the window, then you win big.
                    </p>
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  {selectedOpp.type === 'ARB' ? (
                    <div>
                      <div className="text-sm text-muted-foreground">Guaranteed Profit</div>
                      <div className="text-xl font-bold text-emerald-400">
                        +{formatPercent(selectedOpp.edgePct)}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">If Miss (Risk)</div>
                        <div className="text-xl font-bold text-red-400">
                          {(() => {
                            const rr = calculateMiddleRiskReward(selectedOpp.legs);
                            return rr ? `-$${Math.abs(rr.risk).toFixed(2)}` : '-';
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">If Hit (Reward)</div>
                        <div className="text-xl font-bold text-emerald-400">
                          {(() => {
                            const rr = calculateMiddleRiskReward(selectedOpp.legs);
                            return rr ? `+$${rr.reward.toFixed(2)}` : '-';
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                  {selectedOpp.middleWidth && (
                    <div>
                      <div className="text-sm text-muted-foreground">Window</div>
                      <div className="text-xl font-bold text-cyan-400">
                        {selectedOpp.middleWidth.toFixed(1)} pts
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Game Time</div>
                    <div className="text-xl font-bold">
                      {formatDate(selectedOpp.commenceTime)}
                    </div>
                  </div>
                </div>

                {/* Legs Table */}
                <div>
                  <h4 className="font-semibold mb-3">Legs (with $100 stake)</h4>
                  <LegTable opportunity={selectedOpp} totalStake={100} />
                </div>

                {/* Outcome Scenarios for Middles */}
                {selectedOpp.type === 'MIDDLE' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Outcome Scenarios</h4>
                    <MiddleOutcomeScenarios opportunity={selectedOpp} totalStake={100} />
                  </div>
                )}

                {/* Profit Calculation for Arbs */}
                {selectedOpp.type === 'ARB' && selectedOpp.edgePct > 0 && (
                  <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <div className="text-sm text-emerald-400 mb-1">
                      Guaranteed Profit on $100
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(selectedOpp.edgePct)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LegTable({
  opportunity,
  totalStake,
}: {
  opportunity: Opportunity;
  totalStake: number;
}) {
  // Calculate stakes using shared logic
  const sharedOpp: SharedOpportunity = {
    ...opportunity,
    commenceTime: new Date(opportunity.commenceTime),
    marketKey: opportunity.marketKey as MarketKey,
  };
  const oppWithStakes = addStakesToOpportunity(sharedOpp, totalStake);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Outcome</TableHead>
            <TableHead>Book</TableHead>
            <TableHead className="text-right">Odds</TableHead>
            <TableHead className="text-right">Point</TableHead>
            <TableHead className="text-right">Stake</TableHead>
            <TableHead className="text-right">Payout</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {oppWithStakes.legs.map((leg, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{leg.outcome}</TableCell>
              <TableCell>{leg.bookmakerTitle}</TableCell>
              <TableCell className="text-right font-mono">
                {formatOdds(leg.odds)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {leg.point !== undefined ? leg.point.toFixed(1) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {leg.stake ? formatCurrency(leg.stake) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-emerald-400">
                {leg.stake ? formatCurrency(leg.stake * leg.odds) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MiddleOutcomeScenarios({
  opportunity,
  totalStake,
}: {
  opportunity: Opportunity;
  totalStake: number;
}) {
  const legs = opportunity.legs;
  if (legs.length !== 2) return null;

  const stakePerLeg = totalStake / 2;
  const payout1 = stakePerLeg * legs[0].odds;
  const payout2 = stakePerLeg * legs[1].odds;
  const totalPayout = payout1 + payout2;

  // Parse the points from outcomes for scenario descriptions
  const point1 = legs[0].point;
  const point2 = legs[1].point;

  // Determine scenario labels based on market type
  const isTotal = opportunity.marketKey === 'totals';
  const isSpread = opportunity.marketKey === 'spreads';

  let scenarios: Array<{ label: string; outcome: string; payout: number; profit: number; color: string }> = [];

  if (isTotal && point1 !== undefined && point2 !== undefined) {
    const lowPoint = Math.min(point1, point2);
    const highPoint = Math.max(point1, point2);

    scenarios = [
      {
        label: `Score is ${lowPoint} or less`,
        outcome: 'Under wins, Over loses',
        payout: payout2,
        profit: payout2 - totalStake,
        color: 'text-red-400',
      },
      {
        label: `Score is ${lowPoint + 0.5} to ${highPoint - 0.5}`,
        outcome: 'BOTH BETS WIN!',
        payout: totalPayout,
        profit: totalPayout - totalStake,
        color: 'text-emerald-400',
      },
      {
        label: `Score is ${highPoint} or more`,
        outcome: 'Over wins, Under loses',
        payout: payout1,
        profit: payout1 - totalStake,
        color: 'text-red-400',
      },
    ];
  } else if (isSpread && point1 !== undefined && point2 !== undefined) {
    // For spreads, the middle is the margin of victory range where both bets win
    const homeSpread = point1; // Usually negative for favorite
    const awaySpread = point2; // Usually positive for underdog

    scenarios = [
      {
        label: `Home wins by more than ${Math.abs(homeSpread)}`,
        outcome: 'Home spread wins, Away spread loses',
        payout: payout1,
        profit: payout1 - totalStake,
        color: 'text-red-400',
      },
      {
        label: `Home wins by ${Math.abs(homeSpread) + 0.5} to ${awaySpread - 0.5}`,
        outcome: 'BOTH BETS WIN!',
        payout: totalPayout,
        profit: totalPayout - totalStake,
        color: 'text-emerald-400',
      },
      {
        label: `Home wins by less than ${awaySpread} (or loses)`,
        outcome: 'Away spread wins, Home spread loses',
        payout: payout2,
        profit: payout2 - totalStake,
        color: 'text-red-400',
      },
    ];
  } else {
    // Generic fallback
    scenarios = [
      {
        label: 'First bet wins',
        outcome: 'Leg 1 wins, Leg 2 loses',
        payout: payout1,
        profit: payout1 - totalStake,
        color: 'text-red-400',
      },
      {
        label: 'Middle hits',
        outcome: 'BOTH BETS WIN!',
        payout: totalPayout,
        profit: totalPayout - totalStake,
        color: 'text-emerald-400',
      },
      {
        label: 'Second bet wins',
        outcome: 'Leg 2 wins, Leg 1 loses',
        payout: payout2,
        profit: payout2 - totalStake,
        color: 'text-red-400',
      },
    ];
  }

  return (
    <div className="space-y-2">
      {scenarios.map((scenario, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border ${
            scenario.profit > 0
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{scenario.label}</div>
              <div className={`text-xs ${scenario.profit > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {scenario.outcome}
              </div>
            </div>
            <div className="text-right">
              <div className={`font-bold font-mono ${scenario.color}`}>
                {scenario.profit >= 0 ? '+' : ''}{formatCurrency(scenario.profit)}
              </div>
              <div className="text-xs text-muted-foreground">
                Payout: {formatCurrency(scenario.payout)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
