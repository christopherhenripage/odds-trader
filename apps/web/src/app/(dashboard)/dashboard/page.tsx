import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOpportunityStats } from '@/lib/actions/opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunitiesTable } from '@/components/opportunities-table';
import { OpportunitiesFilter } from '@/components/opportunities-filter';
import { TrendingUp, Target, Activity, Clock, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getOpportunityStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">
            Real-time arbitrage and middle opportunities
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-neon-green/30 bg-neon-green/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
          </span>
          <span className="text-sm text-neon-green font-mono">LIVE</span>
          <span className="text-xs text-white/40">Auto-refresh 15s</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Total Found
              </CardTitle>
              <Activity className="h-5 w-5 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-white font-mono">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-cyan rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-green/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Arbitrages
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-neon-green" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-neon-green font-mono">
                {stats.arbs}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-cyan/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Middles
              </CardTitle>
              <Target className="h-5 w-5 text-neon-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-neon-cyan font-mono">
                {stats.middles}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
          <Card className="relative bg-black/50 border-white/10 hover:border-neon-purple/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">
                Last 24h
              </CardTitle>
              <Clock className="h-5 w-5 text-neon-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-neon-purple font-mono">
                {stats.recentCount}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple rounded-xl blur opacity-10" />
        <Card className="relative bg-black/50 border-white/10">
          <CardHeader className="border-b border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-neon-green" />
                <CardTitle className="text-white">Opportunities</CardTitle>
              </div>
              <OpportunitiesFilter />
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
                    <span className="text-sm text-white/40 font-mono">Loading opportunities...</span>
                  </div>
                </div>
              }
            >
              <OpportunitiesTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
