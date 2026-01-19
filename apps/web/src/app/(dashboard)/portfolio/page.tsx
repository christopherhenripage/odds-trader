'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getPaperAccount,
  getPaperPositions,
  getPaperStats,
  updatePaperAccount,
  closePosition,
  resetPaperAccount,
  type PaperAccountSettings,
} from '@/lib/actions/paper';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  Loader2,
  DollarSign,
  Target,
  Percent,
  RotateCcw,
} from 'lucide-react';
import { PaperPositionStatus, OpportunityType } from '@prisma/client';

interface Position {
  id: string;
  createdAt: Date;
  closedAt: Date | null;
  type: OpportunityType;
  eventId: string;
  summary: string;
  stakeTotal: number;
  edgePct: number;
  status: PaperPositionStatus;
  legs: Array<{
    outcome: string;
    bookmaker: string;
    bookmakerTitle: string;
    odds: number;
    point?: number;
    stake?: number;
  }>;
  notes: string | null;
  payout: number | null;
  latencyMs: number | null;
}

export default function PortfolioPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<PaperAccountSettings | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPaperStats>> | null>(null);
  const [closeDialog, setCloseDialog] = useState<{ position: Position; payout: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountData, positionsData, statsData] = await Promise.all([
        getPaperAccount(),
        getPaperPositions(),
        getPaperStats(),
      ]);
      setAccount(accountData);
      setPositions(positionsData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load portfolio data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!account) return;
    setSaving(true);
    try {
      await updatePaperAccount(account);
      toast({
        title: 'Settings saved',
        description: 'Your paper trading settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClosePosition = async () => {
    if (!closeDialog) return;
    const payout = parseFloat(closeDialog.payout);
    if (isNaN(payout) || payout < 0) {
      toast({
        title: 'Invalid payout',
        description: 'Please enter a valid payout amount',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await closePosition(closeDialog.position.id, payout);
      setCloseDialog(null);
      await loadData();
      toast({
        title: 'Position closed',
        description: `Payout of ${formatCurrency(payout)} recorded.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to close position',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your paper account? This will close all positions and reset your bankroll to $1,000.')) {
      return;
    }

    setSaving(true);
    try {
      await resetPaperAccount();
      await loadData();
      toast({
        title: 'Account reset',
        description: 'Your paper account has been reset to $1,000.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset account',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: PaperPositionStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">OPEN</Badge>;
      case 'CLOSED':
        return <Badge variant="success">CLOSED</Badge>;
      case 'MISSED':
        return <Badge variant="secondary">MISSED</Badge>;
      case 'EDGE_LOST':
        return <Badge variant="destructive">EDGE LOST</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Paper Portfolio</h1>
          <p className="text-muted-foreground">
            Track your simulated trades and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bankroll
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(stats.bankroll)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </CardTitle>
              <Target className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-amber-400">
                {stats.openPositions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total P&L
              </CardTitle>
              {stats.totalProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(stats.totalProfit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {(stats.winRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ROI
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatPercent(stats.roi)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
              <CardDescription>
                Your paper trading positions. Click an open position to close it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No positions yet. Enable auto-fill or wait for the scanner to find opportunities.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead className="text-right">Stake</TableHead>
                        <TableHead className="text-right">Edge</TableHead>
                        <TableHead className="text-right">Payout</TableHead>
                        <TableHead>Opened</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((pos) => (
                        <TableRow
                          key={pos.id}
                          className={pos.status === 'OPEN' ? 'cursor-pointer hover:bg-muted/50' : ''}
                          onClick={() =>
                            pos.status === 'OPEN' &&
                            setCloseDialog({ position: pos, payout: '' })
                          }
                        >
                          <TableCell>{getStatusBadge(pos.status)}</TableCell>
                          <TableCell>
                            <Badge variant={pos.type === 'ARB' ? 'arb' : 'middle'}>
                              {pos.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {pos.summary}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(pos.stakeTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatPercent(pos.edgePct)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {pos.payout !== null ? formatCurrency(pos.payout) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(pos.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          {account && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paper Trading Settings
                </CardTitle>
                <CardDescription>
                  Configure your paper trading simulation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Paper Trading Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow paper positions to be created
                    </p>
                  </div>
                  <Switch
                    checked={account.enabled}
                    onCheckedChange={(enabled) =>
                      setAccount({ ...account, enabled })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Fill</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically fill paper positions when opportunities are found
                    </p>
                  </div>
                  <Switch
                    checked={account.autoFill}
                    onCheckedChange={(autoFill) =>
                      setAccount({ ...account, autoFill })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Open Positions</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={account.maxOpen}
                      onChange={(e) =>
                        setAccount({ ...account, maxOpen: parseInt(e.target.value) || 5 })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">Simulation Parameters</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Latency (ms)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={account.latencyMsMin}
                        onChange={(e) =>
                          setAccount({
                            ...account,
                            latencyMsMin: parseInt(e.target.value) || 400,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Latency (ms)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={account.latencyMsMax}
                        onChange={(e) =>
                          setAccount({
                            ...account,
                            latencyMsMax: parseInt(e.target.value) || 2200,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Slippage (bps)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={account.slippageBps}
                        onChange={(e) =>
                          setAccount({
                            ...account,
                            slippageBps: parseInt(e.target.value) || 35,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Miss Probability</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={account.missFillProb}
                        onChange={(e) =>
                          setAccount({
                            ...account,
                            missFillProb: parseFloat(e.target.value) || 0.08,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Odds Worsen</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={account.maxLegOddsWorsen}
                        onChange={(e) =>
                          setAccount({
                            ...account,
                            maxLegOddsWorsen: parseFloat(e.target.value) || 0.15,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={account.fillEvenIfEdgeLost}
                        onCheckedChange={(fillEvenIfEdgeLost) =>
                          setAccount({ ...account, fillEvenIfEdgeLost })
                        }
                      />
                      <Label>Fill Even If Edge Lost</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Close Position Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={() => setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription>
              Enter the payout amount for this position.
            </DialogDescription>
          </DialogHeader>
          {closeDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{closeDialog.position.summary}</p>
                <p className="text-sm text-muted-foreground">
                  Stake: {formatCurrency(closeDialog.position.stakeTotal)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payout Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={closeDialog.payout}
                  onChange={(e) =>
                    setCloseDialog({ ...closeDialog, payout: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Enter the total amount returned (including original stake if won).
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleClosePosition} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
