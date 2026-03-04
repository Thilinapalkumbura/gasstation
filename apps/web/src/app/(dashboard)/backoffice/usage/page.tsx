'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api/stock.api';
import { usageApi } from '@/lib/api/usage.api';
import { UsageHistoryTable } from '@/components/usage/UsageHistoryTable';
import { DailySummaryChart } from '@/components/usage/DailySummaryChart';
import { PendingApprovalCard } from '@/components/usage/PendingApprovalCard';
import { useUsageSocket } from '@/hooks/useUsageSocket';
import { subDays } from 'date-fns';

type Tab = 'pending' | 'analytics' | 'history';

export default function BackofficeUsagePage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedStation, setSelectedStation] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const twoWeeksAgo = subDays(new Date(), 14).toISOString().slice(0, 10);

  // Connect WS (global room — all stations)
  useUsageSocket();

  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stockApi.getAllSummaries().then((s) => s.map((x) => x)),
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-logs-all'],
    queryFn: () => usageApi.getPendingLogs(),
    refetchInterval: 30_000,
  });
  const pendingLogs = pendingData?.items ?? [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'pending', label: 'Pending Approvals', count: pendingLogs.length },
    { id: 'analytics', label: 'Analytics' },
    { id: 'history', label: 'All Logs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Usage & Sales</h1>
        <p className="text-sm text-gray-500 mt-0.5">Daily shift logs across all stations</p>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ── Pending Approvals (all stations) ──────────────────────────── */}
        {tab === 'pending' && (
          <div className="space-y-4">
            {pendingLoading && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}
            {!pendingLoading && pendingLogs.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500 font-medium">No pending approvals across all stations.</p>
              </div>
            )}
            {pendingLogs.map((log) => (
              <PendingApprovalCard key={log.id} log={log} />
            ))}
          </div>
        )}

        {/* ── Analytics (per-station) ────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-5">
            {/* Station selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Station</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a station</option>
                {stations?.map((s: any) => (
                  <option key={s.stationId} value={s.stationId}>
                    {s.tanks[0]?.station?.name ?? s.stationId}
                  </option>
                ))}
              </select>
            </div>

            {selectedStation ? (
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <DailySummaryChart stationId={selectedStation} days={30} />
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 bg-white rounded-xl border">
                Select a station to view analytics
              </div>
            )}
          </div>
        )}

        {/* ── History (all logs, filterable) ─────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border px-5 py-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Station</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Stations</option>
                  {stations?.map((s: any) => (
                    <option key={s.stationId} value={s.stationId}>
                      {s.tanks[0]?.station?.name ?? s.stationId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6">
              <UsageHistoryTable
                stationId={selectedStation || undefined}
                status={statusFilter || undefined}
                from={twoWeeksAgo}
                to={today}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
