'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { alertsApi, AlertHistoryItem, AlertType } from '@/lib/api/alerts.api';

const TYPE_LABELS: Record<AlertType, string> = {
  FUEL_TANK: 'Fuel Tank',
  SPARE_PART: 'Spare Part',
  GAS_CYLINDER: 'Gas Cylinder',
};

const TYPE_COLORS: Record<AlertType, string> = {
  FUEL_TANK: 'bg-blue-100 text-blue-700',
  SPARE_PART: 'bg-orange-100 text-orange-700',
  GAS_CYLINDER: 'bg-purple-100 text-purple-700',
};

function AlertRow({ alert }: { alert: AlertHistoryItem }) {
  const pct = alert.reorderLevel > 0 ? Math.round((alert.currentStock / alert.reorderLevel) * 100) : 0;
  return (
    <tr className="border-b hover:bg-gray-50 text-sm">
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {new Date(alert.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[alert.type]}`}>
          {TYPE_LABELS[alert.type]}
        </span>
      </td>
      <td className="px-4 py-3 font-medium">{alert.entityName}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className={alert.isCritical ? 'text-red-600 font-semibold' : 'text-yellow-600'}>
          {Number(alert.currentStock).toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-500">
        {Number(alert.reorderLevel).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{pct}%</td>
      <td className="px-4 py-3">
        {alert.isCritical ? (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">Critical</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-medium">Low</span>
        )}
      </td>
    </tr>
  );
}

export default function ManagerAlertsPage() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<AlertType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getAlerts({
        page,
        limit,
        type: typeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setAlerts(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setTypeFilter('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Alert History</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user?.stationId ? 'Your station' : 'All stations'} • {total} alert{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as AlertType | ''); setPage(1); }}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All types</option>
              <option value="FUEL_TANK">Fuel Tank</option>
              <option value="SPARE_PART">Spare Part</option>
              <option value="GAS_CYLINDER">Gas Cylinder</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <button onClick={resetFilters} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border rounded-lg">
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No alerts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Date / Time</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Reorder At</th>
                    <th className="px-4 py-3 text-right">% of Reorder</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
