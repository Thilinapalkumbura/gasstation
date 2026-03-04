'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, ReorderSuggestion } from '@/lib/api/orders.api';
import { CreateOrderModal } from './CreateOrderModal';

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

interface Props {
  onOrderCreated: () => void;
}

export function ReorderSuggestions({ onOrderCreated }: Props) {
  const [createFor, setCreateFor] = useState<ReorderSuggestion | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reorder-suggestions'],
    queryFn: () => ordersApi.getReorderSuggestions(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-sm font-medium text-emerald-800">All tanks above reorder levels</p>
        <p className="text-xs text-emerald-600 mt-0.5">No reorder action required</p>
      </div>
    );
  }

  const needsAction = data.filter((s) => s.needsAction);
  const hasPending = data.filter((s) => !s.needsAction && s.existingOpenPO);

  return (
    <>
      <div className="space-y-3">
        {data.map((suggestion) => (
          <SuggestionRow
            key={suggestion.tankId}
            suggestion={suggestion}
            onCreateOrder={() => setCreateFor(suggestion)}
          />
        ))}
      </div>

      {needsAction.length > 0 && (
        <div className="mt-3 text-xs text-gray-400 text-right">
          {needsAction.length} tank{needsAction.length !== 1 ? 's' : ''} need
          {needsAction.length === 1 ? 's' : ''} immediate action
        </div>
      )}

      {createFor && (
        <CreateOrderModal
          stationId={createFor.stationId}
          prefillItems={[
            { fuelType: createFor.fuelType, quantity: createFor.reorderQtyLitres },
          ]}
          onClose={() => setCreateFor(null)}
          onCreated={() => {
            setCreateFor(null);
            onOrderCreated();
            refetch();
          }}
        />
      )}
    </>
  );
}

function SuggestionRow({
  suggestion,
  onCreateOrder,
}: {
  suggestion: ReorderSuggestion;
  onCreateOrder: () => void;
}) {
  const pct = Math.min(100, Math.round(suggestion.percentageFull));
  const hasPO = !!suggestion.existingOpenPO;

  const barColor =
    suggestion.isCritical
      ? 'bg-red-500'
      : suggestion.percentageFull < 0.3
      ? 'bg-orange-400'
      : 'bg-yellow-400';

  return (
    <div
      className={`rounded-xl border p-4 ${
        suggestion.isCritical
          ? 'border-red-200 bg-red-50'
          : 'border-orange-200 bg-orange-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {suggestion.isCritical && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                CRITICAL
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">
              {FUEL_LABELS[suggestion.fuelType] ?? suggestion.fuelType}
            </span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-600 truncate">
              {suggestion.stationName}, {suggestion.stationCity}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Current:{' '}
            <span className="font-medium text-gray-800">
              {suggestion.currentLevelLitres.toLocaleString()}L
            </span>
            {' '} / Reorder at:{' '}
            <span className="font-medium">{suggestion.reorderLevelLitres.toLocaleString()}L</span>
          </div>
        </div>

        <div className="shrink-0">
          {hasPO ? (
            <div className="text-right">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                PO {suggestion.existingOpenPO!.status}
              </span>
              <div className="text-xs text-gray-400 mt-0.5">
                {suggestion.existingOpenPO!.orderNumber}
              </div>
            </div>
          ) : (
            <button
              onClick={onCreateOrder}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white ${
                suggestion.isCritical
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              Order {suggestion.reorderQtyLitres.toLocaleString()}L →
            </button>
          )}
        </div>
      </div>

      {/* Level bar */}
      <div className="h-1.5 bg-white rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-400 mt-0.5">{pct}% full</div>
    </div>
  );
}
