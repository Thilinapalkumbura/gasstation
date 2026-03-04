'use client';

import { useStockStore } from '@/store/stock.store';
import { cn } from '@/lib/utils';

export function ConnectionBadge() {
  const isConnected = useStockStore((s) => s.isConnected);
  const lastSyncAt = useStockStore((s) => s.lastSyncAt);

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full',
          isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400',
        )}
      />
      <span>{isConnected ? 'Live' : 'Offline'}</span>
      {lastSyncAt && (
        <span className="text-gray-400">
          · {new Date(lastSyncAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}
