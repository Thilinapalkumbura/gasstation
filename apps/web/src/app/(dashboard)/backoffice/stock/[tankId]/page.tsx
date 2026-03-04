'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { stockApi } from '@/lib/api/stock.api';
import { TankGauge } from '@/components/stock/TankGauge';
import { MovementHistoryTable } from '@/components/stock/MovementHistoryTable';
import { RecordMovementModal } from '@/components/stock/RecordMovementModal';
import { ConnectionBadge } from '@/components/stock/ConnectionBadge';
import { useStockSocket } from '@/hooks/useStockSocket';
import { useStockStore } from '@/store/stock.store';

const reorderSchema = z.object({
  capacityLitres: z.number().positive('Capacity must be positive'),
  reorderLevelLitres: z.number().min(0),
  reorderQtyLitres: z.number().positive('Reorder qty must be positive'),
});
type ReorderForm = z.infer<typeof reorderSchema>;

export default function TankDetailPage() {
  const { tankId } = useParams<{ tankId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState(false);

  // HTTP fetch for initial data
  const { data: httpTank } = useQuery({
    queryKey: ['tank', tankId],
    queryFn: () => stockApi.getTank(tankId),
  });

  // Live tank from WS store
  const liveTank = useStockStore((s) => s.tanks[tankId]);
  const tank = liveTank ?? httpTank;

  // Connect WS for this tank's station
  useStockSocket(tank?.stationId);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReorderForm>({
    resolver: zodResolver(reorderSchema),
    values: tank ? { capacityLitres: tank.capacityLitres, reorderLevelLitres: tank.reorderLevelLitres, reorderQtyLitres: tank.reorderQtyLitres } : undefined,
  });

  const reorderMutation = useMutation({
    mutationFn: (data: ReorderForm) => stockApi.updateReorder(tankId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tank', tankId] });
      setReorderSuccess(true);
      setTimeout(() => setReorderSuccess(false), 3000);
    },
  });

  if (!tank) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {tank.fuelType.replace('_', ' ')} Tank
            </h1>
            <p className="text-sm text-gray-500">{tank.station?.name} · {tank.station?.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge />
          <button
            onClick={() => setShowMovementModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Record Movement
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: gauge + reorder settings */}
        <div className="space-y-5">
          <TankGauge {...tank} />

          {/* Tank settings */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Tank Settings</h2>
            <form onSubmit={handleSubmit((d) => reorderMutation.mutate(d))} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tank Capacity (litres)
                </label>
                <input
                  {...register('capacityLitres', { valueAsNumber: true })}
                  type="number"
                  step="500"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.capacityLitres && (
                  <p className="mt-1 text-xs text-red-600">{errors.capacityLitres.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">Physical tank size — limits max delivery</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reorder Settings</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Reorder Level (litres)
                    </label>
                    <input
                      {...register('reorderLevelLitres', { valueAsNumber: true })}
                      type="number"
                      step="100"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.reorderLevelLitres && (
                      <p className="mt-1 text-xs text-red-600">{errors.reorderLevelLitres.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Alert triggered when stock falls below this</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Reorder Quantity (litres)
                    </label>
                    <input
                      {...register('reorderQtyLitres', { valueAsNumber: true })}
                      type="number"
                      step="500"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.reorderQtyLitres && (
                      <p className="mt-1 text-xs text-red-600">{errors.reorderQtyLitres.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Suggested order quantity for reorder alerts</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || reorderMutation.isPending}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg"
              >
                {reorderMutation.isPending ? 'Saving…' : 'Save Settings'}
              </button>
              {reorderSuccess && (
                <p className="text-xs text-emerald-600 text-center">Settings saved!</p>
              )}
            </form>
          </div>

          {/* LKAS 2 valuation */}
          {tank.stationId && (
            <ValuationCard stationId={tank.stationId} tankId={tankId} />
          )}
        </div>

        {/* Right col: movement history */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Movement History</h2>
          <MovementHistoryTable tankId={tankId} />
        </div>
      </div>

      {showMovementModal && (
        <RecordMovementModal
          tank={tank}
          onClose={() => {
            setShowMovementModal(false);
            queryClient.invalidateQueries({ queryKey: ['movements', tankId] });
          }}
        />
      )}
    </div>
  );
}

function ValuationCard({ stationId, tankId }: { stationId: string; tankId: string }) {
  const { data } = useQuery({
    queryKey: ['valuation', stationId],
    queryFn: () => stockApi.getValuation(stationId),
  });

  const tankVal = data?.valuations?.find((v: any) => v.tankId === tankId);
  if (!tankVal) return null;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">LKAS 2 Valuation</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Avg cost/litre</span>
          <span className="font-semibold">LKR {tankVal.avgCostPerLitreLkr.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stock value</span>
          <span className="font-semibold text-blue-700">
            LKR {tankVal.stockValueLkr.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Weighted average cost method (LKAS 2)</p>
      </div>
    </div>
  );
}
