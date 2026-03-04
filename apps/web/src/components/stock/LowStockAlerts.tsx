'use client';

import { useStockStore, selectActiveAlerts } from '@/store/stock.store';
import { cn } from '@/lib/utils';

export function LowStockAlerts() {
  const alerts = useStockStore(selectActiveAlerts);
  const dismissAlert = useStockStore((s) => s.dismissAlert);
  const clearDismissedAlerts = useStockStore((s) => s.clearDismissedAlerts);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Stock Alerts ({alerts.length})
        </h3>
        <button
          onClick={clearDismissedAlerts}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear all
        </button>
      </div>

      {alerts.map((alert) => (
        <div
          key={alert.tankId}
          className={cn(
            'flex items-start justify-between rounded-lg border px-4 py-3 text-sm',
            alert.isCritical
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800',
          )}
        >
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">{alert.isCritical ? '🚨' : '⚠️'}</span>
            <div>
              <div className="font-semibold">
                {alert.isCritical ? 'Critical' : 'Low'} stock — {alert.fuelType.replace('_', ' ')}
              </div>
              <div className="text-xs mt-0.5 opacity-80">
                {alert.stationName} &bull; {alert.currentLevelLitres.toLocaleString()}L remaining
                ({alert.percentageFull}%) &bull; Reorder level: {alert.reorderLevelLitres.toLocaleString()}L
              </div>
            </div>
          </div>
          <button
            onClick={() => dismissAlert(alert.tankId)}
            className="ml-3 text-lg leading-none opacity-50 hover:opacity-100 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
