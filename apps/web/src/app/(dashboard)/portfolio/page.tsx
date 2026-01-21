'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  getCompletedPromos,
  getPromoStats,
  getBookmakerAccounts,
  completePromo,
  addManualPromo,
  addBookmakerAccount,
  updateBookmakerStatus,
} from '@/lib/actions/promos';
import { cn } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  Lock,
  Building2,
  AlertTriangle,
  Ban,
  CircleDot,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { PromoType, CompletedPromoStatus, BookmakerStatus } from '@prisma/client';

const promoTypeLabels: Record<PromoType, string> = {
  SIGN_UP_BONUS: 'Sign Up Bonus',
  DEPOSIT_MATCH: 'Deposit Match',
  FREE_BET: 'Free Bet',
  ODDS_BOOST: 'Odds Boost',
  MONEY_BACK: 'Money Back',
  MULTI_BOOST: 'Multi Boost',
  RELOAD_BONUS: 'Reload Bonus',
  OTHER: 'Other',
};

const statusColors: Record<CompletedPromoStatus, string> = {
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-neon-green/20 text-neon-green border-neon-green/30',
  FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const bookmakerStatusColors: Record<BookmakerStatus, { color: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { color: 'text-neon-green', icon: CheckCircle2 },
  LIMITED: { color: 'text-amber-400', icon: AlertTriangle },
  GUBBED: { color: 'text-orange-500', icon: Ban },
  BANNED: { color: 'text-red-500', icon: Ban },
  PENDING: { color: 'text-white/50', icon: Clock },
};

const australianBookmakers = [
  { id: 'sportsbet', name: 'Sportsbet' },
  { id: 'ladbrokes', name: 'Ladbrokes' },
  { id: 'neds', name: 'Neds' },
  { id: 'pointsbet', name: 'PointsBet' },
  { id: 'tab', name: 'TAB' },
  { id: 'bet365', name: 'Bet365' },
  { id: 'unibet', name: 'Unibet' },
  { id: 'bluebet', name: 'BlueBet' },
  { id: 'palmerbet', name: 'Palmerbet' },
  { id: 'topsport', name: 'TopSport' },
  { id: 'betright', name: 'BetRight' },
  { id: 'boombet', name: 'Boombet' },
];

interface CompletedPromoData {
  id: string;
  createdAt: Date;
  completedAt: Date | null;
  bookmaker: string;
  promoTitle: string;
  promoType: PromoType;
  qualifyingStake: number | null;
  qualifyingLoss: number | null;
  freeStake: number | null;
  profit: number | null;
  status: CompletedPromoStatus;
  notes: string | null;
}

interface BookmakerAccountData {
  id: string;
  bookmaker: string;
  bookmakerName: string;
  status: BookmakerStatus;
  balance: number | null;
  signUpBonus: boolean;
  notes: string | null;
}

export default function PortfolioPage() {
  const { data: session, status: authStatus } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedPromos, setCompletedPromos] = useState<CompletedPromoData[]>([]);
  const [bookmakerAccounts, setBookmakerAccounts] = useState<BookmakerAccountData[]>([]);
  const [stats, setStats] = useState<{ totalProfit: number; completedCount: number; inProgressCount: number; avgProfit: number } | null>(null);

  // Dialog states
  const [completeDialog, setCompleteDialog] = useState<{ promo: CompletedPromoData; profit: string; notes: string } | null>(null);
  const [addPromoDialog, setAddPromoDialog] = useState(false);
  const [addBookmakerDialog, setAddBookmakerDialog] = useState(false);

  // Add promo form
  const [newPromo, setNewPromo] = useState({
    bookmaker: '',
    promoTitle: '',
    promoType: 'SIGN_UP_BONUS' as PromoType,
    profit: '',
    notes: '',
  });

  // Add bookmaker form
  const [newBookmaker, setNewBookmaker] = useState({
    bookmaker: '',
    signUpBonus: false,
    notes: '',
  });

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadData();
    } else if (authStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [authStatus]);

  const loadData = async () => {
    try {
      const [promosData, statsData, accountsData] = await Promise.all([
        getCompletedPromos(),
        getPromoStats(),
        getBookmakerAccounts(),
      ]);
      setCompletedPromos(promosData);
      setStats(statsData);
      setBookmakerAccounts(accountsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePromo = async () => {
    if (!completeDialog) return;
    const profit = parseFloat(completeDialog.profit);
    if (isNaN(profit)) {
      toast({
        title: 'Invalid profit',
        description: 'Please enter a valid profit amount',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await completePromo(completeDialog.promo.id, {
        profit,
        notes: completeDialog.notes || undefined,
      });
      setCompleteDialog(null);
      await loadData();
      toast({
        title: 'Promo completed',
        description: `Recorded profit of $${profit.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete promo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddManualPromo = async () => {
    if (!newPromo.bookmaker || !newPromo.promoTitle || !newPromo.profit) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const profit = parseFloat(newPromo.profit);
    if (isNaN(profit)) {
      toast({
        title: 'Invalid profit',
        description: 'Please enter a valid profit amount',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const bookmaker = australianBookmakers.find(b => b.id === newPromo.bookmaker);
      await addManualPromo({
        bookmaker: newPromo.bookmaker,
        promoTitle: newPromo.promoTitle,
        promoType: newPromo.promoType,
        profit,
        notes: newPromo.notes || undefined,
      });
      setAddPromoDialog(false);
      setNewPromo({ bookmaker: '', promoTitle: '', promoType: 'SIGN_UP_BONUS', profit: '', notes: '' });
      await loadData();
      toast({
        title: 'Promo added',
        description: `Added ${newPromo.promoTitle} with profit of $${profit.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add promo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBookmaker = async () => {
    if (!newBookmaker.bookmaker) {
      toast({
        title: 'Missing bookmaker',
        description: 'Please select a bookmaker',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const bookmaker = australianBookmakers.find(b => b.id === newBookmaker.bookmaker);
      await addBookmakerAccount({
        bookmaker: newBookmaker.bookmaker,
        bookmakerName: bookmaker?.name || newBookmaker.bookmaker,
        signUpBonus: newBookmaker.signUpBonus,
        notes: newBookmaker.notes || undefined,
      });
      setAddBookmakerDialog(false);
      setNewBookmaker({ bookmaker: '', signUpBonus: false, notes: '' });
      await loadData();
      toast({
        title: 'Bookmaker added',
        description: `Added ${bookmaker?.name || newBookmaker.bookmaker} to your accounts`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add bookmaker',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBookmakerStatus = async (bookmaker: string, status: BookmakerStatus) => {
    try {
      await updateBookmakerStatus(bookmaker, status);
      await loadData();
      toast({
        title: 'Status updated',
        description: `Bookmaker status changed to ${status.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-neon-purple" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Sign In Required</h2>
          <p className="text-white/50 max-w-md">
            Track your promo profits and bookmaker accounts. Sign in to get started.
          </p>
        </div>
        <Button asChild className="bg-neon-green hover:bg-neon-green/90 text-black font-semibold">
          <Link href="/auth/signin">Sign In to Track Profits</Link>
        </Button>
      </div>
    );
  }

  const inProgressPromos = completedPromos.filter(p => p.status === 'IN_PROGRESS');
  const completedPromosList = completedPromos.filter(p => p.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-white">Profit Tracker</h1>
          <p className="text-white/50 mt-1">Track your extracted profits and bookmaker accounts</p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-white/10 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
            <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/50">Total Profit</CardTitle>
                <DollarSign className="h-5 w-5 text-neon-green" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold tabular-nums font-mono",
                  stats.totalProfit >= 0 ? "text-neon-green" : "text-red-400"
                )}>
                  ${stats.totalProfit.toFixed(0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
            <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/50">Completed</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-neon-green" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-white font-mono">
                  {stats.completedCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
            <Card className="relative bg-black/50 border-white/10 hover:border-neon-cyan/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/50">In Progress</CardTitle>
                <Clock className="h-5 w-5 text-neon-cyan" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-neon-cyan font-mono">
                  {stats.inProgressCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
            <Card className="relative bg-black/50 border-white/10 hover:border-neon-purple/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/50">Avg Profit</CardTitle>
                <TrendingUp className="h-5 w-5 text-neon-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-neon-purple font-mono">
                  ${stats.avgProfit.toFixed(0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Tabs defaultValue="promos" className="space-y-4">
        <TabsList className="bg-black/50 border border-white/10">
          <TabsTrigger value="promos" className="data-[state=active]:bg-neon-green/10 data-[state=active]:text-neon-green">
            Promos
          </TabsTrigger>
          <TabsTrigger value="bookmakers" className="data-[state=active]:bg-neon-green/10 data-[state=active]:text-neon-green">
            Bookmakers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promos" className="space-y-4">
          {/* In Progress Promos */}
          {inProgressPromos.length > 0 && (
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-neon-cyan" />
                  <CardTitle className="text-white">In Progress</CardTitle>
                </div>
                <CardDescription className="text-white/50">
                  Click to mark as complete and record your profit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inProgressPromos.map(promo => (
                    <div
                      key={promo.id}
                      onClick={() => setCompleteDialog({ promo, profit: '', notes: '' })}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5"
                    >
                      <div>
                        <div className="font-medium text-white">{promo.promoTitle}</div>
                        <div className="text-sm text-white/50">{promo.bookmaker}</div>
                      </div>
                      <Badge variant="outline" className={statusColors.IN_PROGRESS}>
                        In Progress
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Promos */}
          <Card className="bg-black/50 border-white/10">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-neon-green" />
                  <CardTitle className="text-white">Completed Promos</CardTitle>
                </div>
                <Button
                  onClick={() => setAddPromoDialog(true)}
                  className="bg-neon-green hover:bg-neon-green/90 text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {completedPromosList.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-white/40">
                  <Gift className="h-8 w-8 mb-2" />
                  <p>No completed promos yet</p>
                  <p className="text-sm">Start a promo from the dashboard to track it here</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/50">Date</TableHead>
                        <TableHead className="text-white/50">Bookmaker</TableHead>
                        <TableHead className="text-white/50">Promo</TableHead>
                        <TableHead className="text-white/50">Type</TableHead>
                        <TableHead className="text-right text-white/50">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedPromosList.map(promo => (
                        <TableRow key={promo.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white/70">
                            {formatDate(promo.completedAt || promo.createdAt)}
                          </TableCell>
                          <TableCell className="text-white font-medium">{promo.bookmaker}</TableCell>
                          <TableCell className="text-white/70 max-w-[200px] truncate">
                            {promo.promoTitle}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-white/60">
                              {promoTypeLabels[promo.promoType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-mono font-bold",
                              (promo.profit || 0) >= 0 ? "text-neon-green" : "text-red-400"
                            )}>
                              ${(promo.profit || 0).toFixed(2)}
                            </span>
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

        <TabsContent value="bookmakers" className="space-y-4">
          <Card className="bg-black/50 border-white/10">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-neon-purple" />
                  <CardTitle className="text-white">Your Bookmaker Accounts</CardTitle>
                </div>
                <Button
                  onClick={() => setAddBookmakerDialog(true)}
                  className="bg-neon-green hover:bg-neon-green/90 text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
              <CardDescription className="text-white/50">
                Track which bookmakers you have accounts with and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookmakerAccounts.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-white/40">
                  <Building2 className="h-8 w-8 mb-2" />
                  <p>No bookmaker accounts added</p>
                  <p className="text-sm">Add your accounts to track promo eligibility</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {bookmakerAccounts.map(account => {
                    const statusInfo = bookmakerStatusColors[account.status];
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white/50" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{account.bookmakerName}</div>
                            <div className="flex items-center gap-2 text-sm">
                              <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                              <span className={statusInfo.color}>{account.status}</span>
                              {account.signUpBonus && (
                                <Badge variant="outline" className="text-xs bg-neon-green/10 text-neon-green border-neon-green/30">
                                  Sign-up claimed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Select
                          value={account.status}
                          onValueChange={(value) => handleUpdateBookmakerStatus(account.bookmaker, value as BookmakerStatus)}
                        >
                          <SelectTrigger className="w-32 bg-black/50 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/20">
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="LIMITED">Limited</SelectItem>
                            <SelectItem value="GUBBED">Gubbed</SelectItem>
                            <SelectItem value="BANNED">Banned</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Complete Promo Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent className="bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Promo</DialogTitle>
            <DialogDescription className="text-white/50">
              Enter your profit from this promo
            </DialogDescription>
          </DialogHeader>
          {completeDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-medium text-white">{completeDialog.promo.promoTitle}</p>
                <p className="text-sm text-white/50">{completeDialog.promo.bookmaker}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Profit Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={completeDialog.profit}
                  onChange={(e) => setCompleteDialog({ ...completeDialog, profit: e.target.value })}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about this promo..."
                  value={completeDialog.notes}
                  onChange={(e) => setCompleteDialog({ ...completeDialog, notes: e.target.value })}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleCompletePromo} disabled={saving} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Promo Dialog */}
      <Dialog open={addPromoDialog} onOpenChange={setAddPromoDialog}>
        <DialogContent className="bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Manual Promo</DialogTitle>
            <DialogDescription className="text-white/50">
              Record a promo you completed outside of the tracker
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Bookmaker</Label>
              <Select value={newPromo.bookmaker} onValueChange={(v) => setNewPromo({ ...newPromo, bookmaker: v })}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="Select bookmaker" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  {australianBookmakers.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Promo Title</Label>
              <Input
                placeholder="e.g., Bet $50 Get $50"
                value={newPromo.promoTitle}
                onChange={(e) => setNewPromo({ ...newPromo, promoTitle: e.target.value })}
                className="bg-black/50 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Type</Label>
              <Select value={newPromo.promoType} onValueChange={(v) => setNewPromo({ ...newPromo, promoType: v as PromoType })}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  {Object.entries(promoTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Profit ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPromo.profit}
                onChange={(e) => setNewPromo({ ...newPromo, profit: e.target.value })}
                className="bg-black/50 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Notes (optional)</Label>
              <Textarea
                placeholder="Any notes..."
                value={newPromo.notes}
                onChange={(e) => setNewPromo({ ...newPromo, notes: e.target.value })}
                className="bg-black/50 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPromoDialog(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleAddManualPromo} disabled={saving} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Promo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bookmaker Dialog */}
      <Dialog open={addBookmakerDialog} onOpenChange={setAddBookmakerDialog}>
        <DialogContent className="bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Bookmaker Account</DialogTitle>
            <DialogDescription className="text-white/50">
              Track your bookmaker accounts and their status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Bookmaker</Label>
              <Select value={newBookmaker.bookmaker} onValueChange={(v) => setNewBookmaker({ ...newBookmaker, bookmaker: v })}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="Select bookmaker" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  {australianBookmakers
                    .filter(b => !bookmakerAccounts.some(a => a.bookmaker === b.id))
                    .map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="signUpBonus"
                checked={newBookmaker.signUpBonus}
                onChange={(e) => setNewBookmaker({ ...newBookmaker, signUpBonus: e.target.checked })}
                className="rounded border-white/20"
              />
              <Label htmlFor="signUpBonus" className="text-white">Already claimed sign-up bonus</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this account..."
                value={newBookmaker.notes}
                onChange={(e) => setNewBookmaker({ ...newBookmaker, notes: e.target.value })}
                className="bg-black/50 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBookmakerDialog(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleAddBookmaker} disabled={saving} className="bg-neon-green hover:bg-neon-green/90 text-black">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
