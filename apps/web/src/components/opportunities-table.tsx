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
import { ExternalLink, RefreshCw } from 'lucide-react';
import { OpportunityType } from '@prisma/client';
import { addStakesToOpportunity, Opportunity as SharedOpportunity, MarketKey } from '@odds-trader/shared';

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

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const filter: OpportunityFilter = {
        sport: searchParams.get('sport') || undefined,
        market: searchParams.get('market') || undefined,
        type: (searchParams.get('type') as OpportunityType | 'all') || undefined,
        minEdge: Number(searchParams.get('minEdge')) || 0,
        minWidth: Number(searchParams.get('minWidth')) || 0,
      };

      const data = await getOpportunities(filter);
      setOpportunities(data);
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

  const getMarketLabel = (market: string) => {
    switch (market) {
      case 'h2h':
        return 'Moneyline';
      case 'totals':
        return 'Totals';
      case 'spreads':
        return 'Spreads';
      default:
        return market;
    }
  };

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Market</TableHead>
              <TableHead className="text-right">Edge</TableHead>
              <TableHead className="text-right">Width</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.map((opp) => (
              <TableRow
                key={opp.id}
                className="cursor-pointer"
                onClick={() => setSelectedOpp(opp)}
              >
                <TableCell>
                  <Badge variant={getTypeVariant(opp.type)}>{opp.type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {opp.homeTeam} vs {opp.awayTeam}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {opp.sportKey}
                  </div>
                </TableCell>
                <TableCell>{getMarketLabel(opp.marketKey)}</TableCell>
                <TableCell className="text-right font-mono">
                  <span
                    className={
                      opp.edgePct > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                    }
                  >
                    {formatPercent(opp.edgePct)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {opp.middleWidth ? opp.middleWidth.toFixed(1) : '-'}
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
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Edge</div>
                    <div
                      className={`text-xl font-bold ${
                        selectedOpp.edgePct > 0
                          ? 'text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatPercent(selectedOpp.edgePct)}
                    </div>
                  </div>
                  {selectedOpp.middleWidth && (
                    <div>
                      <div className="text-sm text-muted-foreground">Width</div>
                      <div className="text-xl font-bold text-blue-400">
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

                {/* Profit Calculation */}
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
