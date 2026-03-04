'use client';

import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/lib/api/stock.api';
import { cn } from '@/lib/utils';

interface Props {
  tankId?: string;
  stationId?: string;
}

const MOVEMENT_STYLES: Record<string, { label: string; cls: string }> = {
  DELIVERY_IN:   { label: 'Delivery In',   cls: 'bg-emerald-100 text-emerald-800' },
  DISPENSED_OUT: { label: 'Dispensed Out', cls: 'bg-blue-100 text-blue-800' },
  ADJUSTMENT:    { label: 'Adjustment',    cls: 'bg-purple-100 text-purple-800' },
  OPENING_STOCK: { label: 'Opening Stock', cls: 'bg-gray-100 text-gray-800' },
};

export function MovementHistoryTable({ tankId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['movements', tankId],
    queryFn: () => stockApi.getMovements({ tankId, limit: 30 }),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No movements recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 font-medium uppercase tracking-wide">
            <th className="pb-2 pr-4">Date / Time</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Fuel</th>
            <th className="pb-2 pr-4 text-right">Quantity</th>
            <th className="pb-2 pr-4 text-right">Balance After</th>
            <th className="pb-2 pr-4">Reference</th>
            <th className="pb-2">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((m) => {
            const style = MOVEMENT_STYLES[m.type] ?? { label: m.type, cls: 'bg-gray-100 text-gray-700' };
            const isOut = m.type === 'DISPENSED_OUT';
            return (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleString('en-LK', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', style.cls)}>
                    {style.label}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-gray-700">
                  {m.tank.fuelType.replace('_', ' ')}
                </td>
                <td className={cn('py-2.5 pr-4 text-right font-semibold tabular-nums',
                  isOut ? 'text-blue-700' : 'text-emerald-700')}>
                  {isOut ? '−' : '+'}{Number(m.quantityLitres).toLocaleString()}L
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-gray-900">
                  {Number(m.balanceAfterLitres).toLocaleString()}L
                </td>
                <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">
                  {m.reference || '—'}
                </td>
                <td className="py-2.5 text-gray-600 text-xs">
                  {m.createdBy.fullName}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data && data.total > 30 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Showing 30 of {data.total} movements
        </p>
      )}
    </div>
  );
}
