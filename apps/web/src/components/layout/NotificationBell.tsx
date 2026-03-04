'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useStockStore, selectActiveAlerts as selectTankAlerts } from '@/store/stock.store';
import { useAlertsStore, selectActiveReorderAlerts } from '@/store/alerts.store';
import { useAlertsSocket } from '@/hooks/useAlertsSocket';

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function AlertRow({
  label,
  labelColor,
  title,
  subtitle,
  detail,
  onDismiss,
}: {
  label: string;
  labelColor: 'red' | 'yellow';
  title: string;
  subtitle: string;
  detail: string;
  onDismiss: () => void;
}) {
  const bg = labelColor === 'red' ? 'bg-red-50' : 'bg-yellow-50';
  const badge =
    labelColor === 'red'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <div className={`px-4 py-3 ${bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 ${badge}`}>
            {label}
          </span>
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
          <p className="text-xs text-gray-600 mt-0.5">{detail}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Establish global alert socket (all 3 types)
  useAlertsSocket();

  const tankAlerts = useStockStore(selectTankAlerts);
  const reorderAlerts = useAlertsStore(selectActiveReorderAlerts);
  const { dismissAlert: dismissTank } = useStockStore();
  const { dismissAlert: dismissReorder } = useAlertsStore();

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Only managers and backoffice/admin see alerts
  if (!user || user.role === 'WORKER') return null;

  const totalCount = tankAlerts.length + reorderAlerts.length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label={`${totalCount} reorder alert${totalCount !== 1 ? 's' : ''}`}
      >
        <BellIcon className={`w-5 h-5 ${totalCount > 0 ? 'text-red-500' : ''}`} />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[520px] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Reorder Alerts</h3>
            </div>
            {totalCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {totalCount} active
              </span>
            )}
          </div>

          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <BellIcon className="w-8 h-8 opacity-30" />
              <p className="text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* ── Fuel tank alerts ── */}
              {tankAlerts.map((a) => (
                <AlertRow
                  key={a.tankId}
                  label={a.isCritical ? 'Critical — Fuel' : 'Low — Fuel'}
                  labelColor={a.isCritical ? 'red' : 'yellow'}
                  title={a.fuelType.replace(/_/g, ' ')}
                  subtitle={a.stationName}
                  detail={`${Number(a.currentLevelLitres).toLocaleString()} L — Reorder at ${Number(a.reorderLevelLitres).toLocaleString()} L`}
                  onDismiss={() => dismissTank(a.tankId)}
                />
              ))}

              {/* ── Spare parts + cylinder alerts ── */}
              {reorderAlerts.map((a) => (
                <AlertRow
                  key={a.id}
                  label={
                    a.isCritical
                      ? `Out of Stock — ${a.type === 'spare_part' ? 'Parts' : 'Cylinders'}`
                      : `Low — ${a.type === 'spare_part' ? 'Parts' : 'Cylinders'}`
                  }
                  labelColor={a.isCritical ? 'red' : 'yellow'}
                  title={a.itemName}
                  subtitle={a.stationName}
                  detail={`${a.currentStock} units — Reorder at ${a.reorderLevel}`}
                  onDismiss={() => dismissReorder(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
