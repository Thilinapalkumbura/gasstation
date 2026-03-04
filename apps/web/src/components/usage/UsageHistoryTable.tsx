'use client';

import { useQuery } from '@tanstack/react-query';
import { usageApi } from '@/lib/api/usage.api';
import { StatusBadge } from './StatusBadge';
import { VarianceBadge } from './VarianceBadge';
import { cn } from '@/lib/utils';

interface Props {
  stationId?: string;
  tankId?: string;
  workerId?: string;
  status?: string;
  from?: string;
  to?: string;
  compact?: boolean;
}

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

const SHIFT_LABELS: Record<string, string> = {
  MORNING: '🌅 Morning', EVENING: '🌆 Evening', NIGHT: '🌙 Night',
};

export function UsageHistoryTable({ stationId, tankId, status, from, to, compact }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-logs', { stationId, tankId, status, from, to }],
    queryFn: () => usageApi.getLogs({ stationId, tankId, status: status as any, from, to, limit: 30 }),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  const logs = data?.items ?? [];

  if (!logs.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No usage logs found for the selected filters.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className={cn(
            'bg-white rounded-xl border px-4 py-3 flex items-center gap-3',
            log.status === 'REJECTED' && 'border-red-200 bg-red-50',
          )}>
            <div className="text-xl">{SHIFT_LABELS[log.shiftType]?.slice(0, 2)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {FUEL_LABELS[log.tank.fuelType] ?? log.tank.fuelType}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(log.date).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {log.dispensedLitres.toFixed(0)}L dispensed ·{' '}
                LKR {log.totalSalesLkr.toLocaleString()}
              </div>
              {log.status === 'REJECTED' && log.rejectionNotes && (
                <div className="text-xs text-red-700 mt-1 bg-red-100 rounded px-2 py-0.5">
                  {log.rejectionNotes}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={log.status} />
              <VarianceBadge varianceLitres={log.varianceLitres} severity={log.varianceSeverity} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 font-medium uppercase tracking-wide">
            <th className="pb-2 pr-3">Date</th>
            <th className="pb-2 pr-3">Shift</th>
            <th className="pb-2 pr-3">Fuel</th>
            <th className="pb-2 pr-3">Station</th>
            <th className="pb-2 pr-3 text-right">Dispensed</th>
            <th className="pb-2 pr-3 text-right">Total Sales</th>
            <th className="pb-2 pr-3">Variance</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2">Recorded by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log) => (
            <tr key={log.id} className={cn(
              'hover:bg-gray-50 transition-colors',
              log.status === 'REJECTED' && 'bg-red-50',
            )}>
              <td className="py-3 pr-3 text-gray-500 whitespace-nowrap text-xs">
                {new Date(log.date).toLocaleDateString('en-LK')}
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                {SHIFT_LABELS[log.shiftType]}
              </td>
              <td className="py-3 pr-3 text-gray-700">
                {FUEL_LABELS[log.tank.fuelType] ?? log.tank.fuelType}
              </td>
              <td className="py-3 pr-3 text-gray-500 text-xs">
                {log.tank.station.name}
              </td>
              <td className="py-3 pr-3 text-right font-semibold tabular-nums">
                {log.dispensedLitres.toFixed(1)}L
              </td>
              <td className="py-3 pr-3 text-right tabular-nums text-blue-700 font-medium">
                LKR {log.totalSalesLkr.toLocaleString()}
              </td>
              <td className="py-3 pr-3">
                <VarianceBadge varianceLitres={log.varianceLitres} severity={log.varianceSeverity} />
              </td>
              <td className="py-3 pr-3">
                <StatusBadge status={log.status} />
              </td>
              <td className="py-3 text-gray-500 text-xs">{log.recordedBy.fullName}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.total > 30 && (
        <p className="mt-3 text-xs text-gray-400 text-center">Showing 30 of {data.total} records</p>
      )}
    </div>
  );
}
