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
import { ExternalLink, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { OpportunityType } from '@prisma/client';

type SortColumn = 'type' | 'event' | 'market' | 'edge' | 'width' | 'time';
type SortDirection = 'asc' | 'desc';
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

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'event':
        comparison = `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`);
        break;
      case 'market':
        comparison = a.marketKey.localeCompare(b.marketKey);
        break;
      case 'edge':
        comparison = a.edgePct - b.edgePct;
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
                  Edge {getSortIcon('edge')}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none hover:text-white transition-colors"
                onClick={() => handleSort('width')}
              >
                <div className="flex items-center justify-end">
                  Width {getSortIcon('width')}
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
