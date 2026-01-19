'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  getLatestHeartbeat,
  getHeartbeatHistory,
  getSystemStats,
  getRecentDeliveries,
} from '@/lib/actions/admin';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
  Activity,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Bell,
  Database,
  Zap,
} from 'lucide-react';

interface Heartbeat {
  id: string;
  createdAt: Date;
  lastScanAt: Date;
  polls: number;
  lastError: string | null;
  apiCalls: number;
}

interface SystemStats {
  totalOpportunities: number;
  todayOpportunities: number;
  totalDeliveries: number;
  failedDeliveries: number;
  deliverySuccessRate: number;
  totalUsers: number;
  activeUsers: number;
}

interface Delivery {
  id: string;
  createdAt: Date;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  channel: string;
  error: string | null;
  opportunity: {
    type: string;
    homeTeam: string;
    awayTeam: string;
    edgePct: number;
  };
  user: {
    email: string | null;
  };
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);
  const [heartbeatHistory, setHeartbeatHistory] = useState<Heartbeat[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hb, hbHistory, sysStats, recentDeliveries] = await Promise.all([
        getLatestHeartbeat(),
        getHeartbeatHistory(),
        getSystemStats(),
        getRecentDeliveries(),
      ]);
      setHeartbeat(hb);
      setHeartbeatHistory(hbHistory);
      setStats(sysStats);
      setDeliveries(recentDeliveries as Delivery[]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getWorkerStatus = () => {
    if (!heartbeat) return { status: 'unknown', color: 'secondary' };

    const lastScan = new Date(heartbeat.lastScanAt);
    const diffMs = Date.now() - lastScan.getTime();
    const diffMins = diffMs / 1000 / 60;

    if (diffMins < 2) return { status: 'healthy', color: 'success' };
    if (diffMins < 5) return { status: 'slow', color: 'warning' };
    return { status: 'down', color: 'destructive' };
  };

  const workerStatus = getWorkerStatus();

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
          <h1 className="text-3xl font-bold">System Admin</h1>
          <p className="text-muted-foreground">
            Monitor worker health and system status
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Worker Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Worker Status</CardTitle>
            </div>
            <Badge variant={workerStatus.color as 'success' | 'warning' | 'destructive' | 'secondary'}>
              {workerStatus.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>Scanner worker health and activity</CardDescription>
        </CardHeader>
        <CardContent>
          {heartbeat ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Last Scan</div>
                <div className="text-lg font-semibold">
                  {formatRelativeTime(heartbeat.lastScanAt)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Polls</div>
                <div className="text-lg font-semibold tabular-nums">
                  {heartbeat.polls.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">API Calls</div>
                <div className="text-lg font-semibold tabular-nums">
                  {heartbeat.apiCalls.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Error</div>
                <div className="text-lg font-semibold">
                  {heartbeat.lastError ? (
                    <span className="text-destructive truncate block max-w-[200px]">
                      {heartbeat.lastError}
                    </span>
                  ) : (
                    <span className="text-emerald-400">None</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No heartbeat data found. Worker may not be running.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Opportunities
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stats.totalOpportunities.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.todayOpportunities} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Delivery Rate
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stats.deliverySuccessRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalDeliveries} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stats.totalUsers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Alerts
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stats.activeUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                users with notifications
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Latest notification delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deliveries yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        {delivery.status === 'SENT' && (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        )}
                        {delivery.status === 'FAILED' && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        {delivery.status === 'SKIPPED' && (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{delivery.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {delivery.user.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">
                          {delivery.opportunity.type}:
                        </span>{' '}
                        {delivery.opportunity.homeTeam} vs{' '}
                        {delivery.opportunity.awayTeam}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(delivery.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heartbeat History */}
      <Card>
        <CardHeader>
          <CardTitle>Heartbeat History</CardTitle>
          <CardDescription>Recent worker heartbeat records</CardDescription>
        </CardHeader>
        <CardContent>
          {heartbeatHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No heartbeat history.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Polls</TableHead>
                    <TableHead>API Calls</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heartbeatHistory.map((hb) => (
                    <TableRow key={hb.id}>
                      <TableCell className="text-sm">
                        {formatDate(hb.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {hb.polls.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {hb.apiCalls.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {hb.lastError ? (
                          <span className="text-destructive truncate block max-w-[300px]">
                            {hb.lastError}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
