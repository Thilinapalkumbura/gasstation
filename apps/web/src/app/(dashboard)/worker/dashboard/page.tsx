'use client';

import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api/stock.api';
import { useAuthStore } from '@/store/auth.store';
import { useStockStore } from '@/store/stock.store';
import { useStockSocket } from '@/hooks/useStockSocket';
import { TankGauge } from '@/components/stock/TankGauge';
import { LowStockAlerts } from '@/components/stock/LowStockAlerts';
import { ConnectionBadge } from '@/components/stock/ConnectionBadge';

export default function WorkerDashboard() {
  const user = useAuthStore((s) => s.user);
  const stationId = user?.stationId ?? '';

  // WebSocket scoped to this worker's station
  useStockSocket(stationId);

  // Initial HTTP fetch
  const { data: summary, isLoading } = useQuery({
    queryKey: ['stock-summary', stationId],
    queryFn: () => stockApi.getStationSummary(stationId),
    enabled: !!stationId,
    onSuccess: (data: any) => {
      useStockStore.getState().setTanks(data.tanks);
    },
    refetchInterval: 60_000,
  } as any);

  // Live tanks from WS store
  const storeTanks = useStockStore((s) =>
    Object.values(s.tanks).filter((t) => t.stationId === stationId),
  );
  const tanks = storeTanks.length > 0 ? storeTanks : summary?.tanks ?? [];

  const now = new Date().toLocaleString('en-LK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {summary?.tanks[0]?.station?.name ?? 'My Station'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{now}</p>
            {user?.fullName && (
              <p className="text-sm text-gray-700 mt-1 font-medium">
                Welcome, {user.fullName.split(' ')[0]}
              </p>
            )}
          </div>
          <ConnectionBadge />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Alerts */}
        <LowStockAlerts />

        {/* Quick stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {tanks.length}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Tanks</div>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {Math.round(summary.overallPercentage)}%
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Overall</div>
            </div>
            <div className={`rounded-xl border p-3 text-center ${
              summary.lowStockCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
            }`}>
              <div className={`text-2xl font-bold ${
                summary.lowStockCount > 0 ? 'text-yellow-600' : 'text-gray-900'
              }`}>
                {summary.lowStockCount}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Low Tanks</div>
            </div>
          </div>
        )}

        {/* Tank gauges — compact on mobile */}
        {isLoading && !tanks.length ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile: compact list view */}
            <div className="md:hidden bg-white rounded-xl border shadow-sm divide-y">
              {tanks.map((tank) => (
                <div key={tank.id} className="px-4 py-3">
                  <TankGauge {...tank} compact />
                </div>
              ))}
            </div>

            {/* Desktop: card grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {tanks.map((tank) => (
                <TankGauge key={tank.id} {...tank} />
              ))}
            </div>
          </>
        )}

        {/* Worker info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <strong>Note:</strong> Stock levels update automatically. If you notice a significant
          discrepancy, report to your station manager immediately.
        </div>
      </div>
    </div>
  );
}
