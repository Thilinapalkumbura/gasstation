'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useUsageStore } from '@/store/usage.store';
import { useUsageSocket } from '@/hooks/useUsageSocket';
import { useStockSocket } from '@/hooks/useStockSocket';
import { usageApi } from '@/lib/api/usage.api';
import { PendingApprovalCard } from '@/components/usage/PendingApprovalCard';
import { UsageHistoryTable } from '@/components/usage/UsageHistoryTable';
import { DailySummaryChart } from '@/components/usage/DailySummaryChart';
import { ConnectionBadge } from '@/components/stock/ConnectionBadge';
import { TankGauge } from '@/components/stock/TankGauge';
import { useStockStore } from '@/store/stock.store';
import { stockApi } from '@/lib/api/stock.api';

type Tab = 'approvals' | 'stock' | 'analytics' | 'history';

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const stationId = user?.stationId ?? '';
  const [tab, setTab] = useState<Tab>('approvals');
  const pendingCount = useUsageStore((s) => s.pendingCount);

  // Connect both WebSockets
  useUsageSocket(stationId);
  useStockSocket(stationId);

  // Pending logs
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-logs'],
    queryFn: () => usageApi.getPendingLogs(),
    refetchInterval: 30_000,
  });
  const pendingLogs = pendingData?.items ?? [];

  // Stock
  const { data: stockData } = useQuery({
    queryKey: ['stock-summary', stationId],
    queryFn: () => stockApi.getStationSummary(stationId),
    enabled: !!stationId,
    onSuccess: (d: any) => useStockStore.getState().setTanks(d.tanks),
  } as any);
  const liveTanks = useStockStore((s) =>
    Object.values(s.tanks).filter((t) => t.stationId === stationId),
  );
  const tanks = liveTanks.length > 0 ? liveTanks : stockData?.tanks ?? [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'approvals', label: 'Pending Approvals', count: pendingLogs.length },
    { id: 'stock', label: 'Stock Levels' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'history', label: 'All Logs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Station Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.fullName}</p>
        </div>
        <ConnectionBadge />
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ── Pending Approvals ──────────────────────────────────────────── */}
        {tab === 'approvals' && (
          <div className="space-y-4">
            {pendingLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!pendingLoading && pendingLogs.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500 font-medium">All caught up! No pending approvals.</p>
                <p className="text-sm text-gray-400 mt-1">New submissions will appear here in real-time.</p>
              </div>
            )}

            {pendingLogs.map((log) => (
              <PendingApprovalCard key={log.id} log={log} />
            ))}
          </div>
        )}

        {/* ── Stock Levels ───────────────────────────────────────────────── */}
        {tab === 'stock' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tanks.map((tank) => (
                <TankGauge key={tank.id} {...tank} />
              ))}
            </div>
          </div>
        )}

        {/* ── Analytics ─────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              Usage Analytics — Last 14 Days
            </h2>
            {stationId && <DailySummaryChart stationId={stationId} days={14} />}
          </div>
        )}

        {/* ── All Logs ───────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">All Usage Logs</h2>
            <UsageHistoryTable stationId={stationId} />
          </div>
        )}
      </div>
    </div>
  );
}
