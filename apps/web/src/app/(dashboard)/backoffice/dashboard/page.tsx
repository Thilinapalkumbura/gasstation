'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi, TankSnapshot } from '@/lib/api/stock.api';
import { useStockStore, selectTanksByStation } from '@/store/stock.store';
import { useStockSocket } from '@/hooks/useStockSocket';
import { TankGauge } from '@/components/stock/TankGauge';
import { LowStockAlerts } from '@/components/stock/LowStockAlerts';
import { ConnectionBadge } from '@/components/stock/ConnectionBadge';
import { RecordMovementModal } from '@/components/stock/RecordMovementModal';
import { MovementHistoryTable } from '@/components/stock/MovementHistoryTable';

export default function BackofficeDashboard() {
  const [selectedTank, setSelectedTank] = useState<TankSnapshot | null>(null);
  const [movementTank, setMovementTank] = useState<TankSnapshot | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Connect WebSocket — global room (all stations)
  useStockSocket();

  // Initial HTTP fetch to hydrate the store
  const { data: summaries, isLoading } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.getAllSummaries(),
    onSuccess: (data) => {
      const allTanks = data.flatMap((s) => s.tanks);
      useStockStore.getState().setTanks(allTanks);
    },
    refetchInterval: 60_000,  // background refresh every 60s
  } as any);

  // Live tanks from WebSocket-driven store
  const liveTanks = useStockStore((s) => Object.values(s.tanks));
  const isConnected = useStockStore((s) => s.isConnected);

  // Aggregate per-station from live store (falls back to HTTP data while WS connects)
  const stations = summaries ?? [];
  const displayTanks = liveTanks.length > 0 ? liveTanks : stations.flatMap((s: any) => s.tanks);

  // Group tanks by station
  const byStation = displayTanks.reduce<Record<string, { name: string; city: string; tanks: TankSnapshot[] }>>(
    (acc, tank) => {
      const key = tank.stationId;
      if (!acc[key]) {
        acc[key] = {
          name: tank.station?.name ?? tank.stationId,
          city: tank.station?.city ?? '',
          tanks: [],
        };
      }
      acc[key].tanks.push(tank);
      return acc;
    },
    {},
  );

  const totalLow = displayTanks.filter((t) => t.isLow).length;
  const totalCritical = displayTanks.filter((t) => t.isCritical).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">All stations — real-time fuel levels</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionBadge />
          {totalCritical > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {totalCritical} Critical
            </span>
          )}
          {totalLow > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {totalLow} Low
            </span>
          )}
        </div>
      </header>

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Alerts panel */}
        <LowStockAlerts />

        {/* Loading skeleton */}
        {isLoading && !displayTanks.length && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Per-station sections */}
        {Object.entries(byStation).map(([stationId, { name, city, tanks }]) => {
          const stationLow = tanks.filter((t) => t.isLow).length;
          const totalPct = Math.round(
            tanks.reduce((s, t) => s + t.percentageFull, 0) / (tanks.length || 1),
          );

          return (
            <section key={stationId}>
              {/* Station header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-gray-800">{name}</h2>
                  <span className="text-sm text-gray-400">{city}</span>
                  {stationLow > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {stationLow} tank{stationLow > 1 ? 's' : ''} low
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Overall {totalPct}%</span>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    Movement history
                  </button>
                </div>
              </div>

              {/* Tank grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {tanks.map((tank) => (
                  <div key={tank.id} className="group relative">
                    <TankGauge {...tank} />
                    {/* Hover actions */}
                    <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={() => setSelectedTank(tank)}
                        className="flex-1 text-xs bg-white/90 border border-gray-300 text-gray-700 py-1.5 rounded-lg hover:bg-gray-100 backdrop-blur-sm"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setMovementTank(tank)}
                        className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        + Movement
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Movement history panel */}
        {showHistory && (
          <section className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Movement History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <MovementHistoryTable />
          </section>
        )}
      </div>

      {/* Record movement modal */}
      {movementTank && (
        <RecordMovementModal
          tank={movementTank}
          onClose={() => setMovementTank(null)}
        />
      )}
    </div>
  );
}
