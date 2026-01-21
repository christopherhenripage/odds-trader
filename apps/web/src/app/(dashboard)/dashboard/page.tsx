import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActivePromos, getPromoStats, getCompletedPromos, seedInitialPromos } from '@/lib/actions/promos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromoCard } from '@/components/promo-card';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Gift,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Promos | Promo Profit Tracker',
  description: 'Track and extract profit from bookmaker promotions',
};

async function PromoList() {
  const [promos, completedPromos] = await Promise.all([
    getActivePromos(),
    getCompletedPromos(),
  ]);

  // Seed promos if none exist
  if (promos.length === 0) {
    await seedInitialPromos();
    const freshPromos = await getActivePromos();
    return <PromoListContent promos={freshPromos} completedPromos={completedPromos} />;
  }

  return <PromoListContent promos={promos} completedPromos={completedPromos} />;
}

function PromoListContent({ promos, completedPromos }: { promos: any[]; completedPromos: any[] }) {
  const startedPromoIds = new Set(
    completedPromos
      .filter(cp => cp.status === 'IN_PROGRESS')
      .map(cp => cp.promoId)
  );

  const featuredPromos = promos.filter(p => p.featured);
  const otherPromos = promos.filter(p => !p.featured);

  if (promos.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/50">No promos available right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {featuredPromos.length > 0 && (
        <div className="space-y-3">
          {featuredPromos.map(promo => (
            <PromoCard
              key={promo.id}
              promo={promo}
              isStarted={startedPromoIds.has(promo.id)}
            />
          ))}
        </div>
      )}

      {otherPromos.length > 0 && (
        <div className="space-y-3">
          {featuredPromos.length > 0 && (
            <h3 className="text-sm font-medium text-white/40 pt-4">More Promos</h3>
          )}
          {otherPromos.map(promo => (
            <PromoCard
              key={promo.id}
              promo={promo}
              isStarted={startedPromoIds.has(promo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getPromoStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Promo Dashboard</h1>
        <p className="text-white/50 mt-1">
          Extract guaranteed profit from bookmaker sign-up offers
        </p>
      </div>

      {/* Quick Info Banner */}
      {stats.completedCount === 0 && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-neon-green/10 via-neon-cyan/10 to-neon-purple/10 border border-white/10">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-neon-cyan mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-white">New to Matched Betting?</h3>
              <p className="text-sm text-white/70 mt-1">
                Use our <Link href="/calculators" className="text-neon-cyan hover:underline">calculators</Link> to lock in guaranteed profit from these promos.
                Most sign-up bonuses can yield <span className="text-neon-green font-medium">$30-80 profit each</span> with zero risk.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Total Profit
              </CardTitle>
              <DollarSign className="h-5 w-5 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-neon-green font-mono">
                ${stats.totalProfit.toFixed(0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Completed
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-white/50">
                In Progress
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-white/50">
                Avg Profit
              </CardTitle>
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

      {/* Available Promos */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple rounded-xl blur opacity-10" />
        <Card className="relative bg-black/50 border-white/10">
          <CardHeader className="border-b border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-neon-green" />
                <CardTitle className="text-white">Available Promos</CardTitle>
              </div>
              <Link href="/portfolio">
                <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
                  View Profit History
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Suspense
              fallback={
                <div className="h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-neon-green/20 border-t-neon-green animate-spin" />
                    </div>
                    <span className="text-sm text-white/40 font-mono">Loading promos...</span>
                  </div>
                </div>
              }
            >
              <PromoList />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-neon-green" />
            <span className="text-sm font-semibold text-white">Start with Sign-Ups</span>
          </div>
          <p className="text-xs text-white/50">
            Sign-up bonuses are one-time offers. Start with these first - they have the highest expected value per promo.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-neon-cyan" />
            <span className="text-sm font-semibold text-white">Use the Calculators</span>
          </div>
          <p className="text-xs text-white/50">
            Our calculators tell you exactly how much to stake at both the bookmaker and exchange to lock in profit.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-neon-purple" />
            <span className="text-sm font-semibold text-white">Track Everything</span>
          </div>
          <p className="text-xs text-white/50">
            Log your completed promos in the Profit section to track your total earnings and stay motivated.
          </p>
        </div>
      </div>
    </div>
  );
}
