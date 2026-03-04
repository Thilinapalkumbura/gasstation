'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { stockApi } from '@/lib/api/stock.api';
import { usageApi } from '@/lib/api/usage.api';
import { ordersApi } from '@/lib/api/orders.api';

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtLkr = (n: number) => `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });

const TABS = ['Overview', 'Fuel Stock', 'Usage Logs', 'Orders', 'Services', 'Spare Parts', 'Gas Cylinders'] as const;
type Tab = typeof TABS[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PARTIALLY_DELIVERED: 'bg-orange-100 text-orange-700',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function FuelBar({ pct, isLow, isCritical }: { pct: number; isLow: boolean; isCritical: boolean }) {
  const color = isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Tab: Overview ──────────────────────────────────────────────────────────
function OverviewTab({ stationId, station }: { stationId: string; station: any }) {
  const { data: summary } = useQuery({
    queryKey: ['station-summary', stationId],
    queryFn: () => stockApi.getStationSummary(stationId),
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count', stationId],
    queryFn: () => usageApi.getPendingCount(stationId),
  });

  const { data: orderSummary } = useQuery({
    queryKey: ['order-summary', stationId],
    queryFn: () => ordersApi.getSummary(stationId),
  });

  return (
    <div className="space-y-6">
      {/* Station Info */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Station Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-500 text-xs mb-1">Name</p><p className="font-medium">{station.name}</p></div>
          <div><p className="text-gray-500 text-xs mb-1">City</p><p className="font-medium">{station.city}</p></div>
          <div><p className="text-gray-500 text-xs mb-1">Status</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${station.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {station.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {station.address && <div className="col-span-2"><p className="text-gray-500 text-xs mb-1">Address</p><p className="font-medium">{station.address}</p></div>}
          {station.contactNumber && <div><p className="text-gray-500 text-xs mb-1">Phone</p><p className="font-medium">{station.contactNumber}</p></div>}
          {station.contactEmail && <div><p className="text-gray-500 text-xs mb-1">Email</p><p className="font-medium">{station.contactEmail}</p></div>}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Total Fuel Capacity</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summary ? fmt(summary.totalCapacityLitres) : '—'}</p>
          <p className="text-xs text-gray-400">litres</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Current Stock</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{summary ? fmt(summary.totalCurrentLitres) : '—'}</p>
          <p className="text-xs text-gray-400">{summary ? `${summary.overallPercentage.toFixed(1)}% full` : ''}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Pending Approvals</p>
          <p className={`text-xl font-bold mt-1 ${(pendingCount ?? 0) > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{pendingCount ?? '—'}</p>
          <p className="text-xs text-gray-400">usage logs</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500">Open Orders</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{orderSummary ? (orderSummary.draftCount + orderSummary.submittedCount + orderSummary.approvedCount) : '—'}</p>
          <p className="text-xs text-gray-400">purchase orders</p>
        </div>
      </div>

      {/* Low stock alert */}
      {summary && summary.lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700">⚠ {summary.lowStockCount} tank{summary.lowStockCount > 1 ? 's' : ''} at low stock</p>
          <div className="mt-2 space-y-1">
            {summary.lowStockTanks.map(t => (
              <p key={t.id} className="text-xs text-red-600">
                {t.fuelType.replace(/_/g, ' ')} — {fmt(t.currentLevelLitres)} L ({t.percentageFull.toFixed(1)}%)
                {t.isCritical && <span className="ml-2 font-bold">CRITICAL</span>}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Fuel Stock ────────────────────────────────────────────────────────
function FuelStockTab({ stationId }: { stationId: string }) {
  const { data: tanks = [], isLoading } = useQuery({
    queryKey: ['tanks', stationId],
    queryFn: () => stockApi.getTanks(stationId),
  });

  if (isLoading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {tanks.map(tank => (
        <div key={tank.id} className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900">{tank.fuelType.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-400 mt-0.5">Tank ID: {tank.id.slice(0, 8)}…</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${tank.isCritical ? 'bg-red-100 text-red-700' : tank.isLow ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {tank.isCritical ? 'Critical' : tank.isLow ? 'Low' : 'OK'}
            </span>
          </div>
          <FuelBar pct={tank.percentageFull} isLow={tank.isLow} isCritical={tank.isCritical} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="text-gray-400">Current</p><p className="font-semibold text-gray-900">{fmt(tank.currentLevelLitres)} L</p></div>
            <div><p className="text-gray-400">Capacity</p><p className="font-semibold text-gray-900">{fmt(tank.capacityLitres)} L</p></div>
            <div><p className="text-gray-400">Full</p><p className="font-semibold text-gray-900">{tank.percentageFull.toFixed(1)}%</p></div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs border-t pt-2">
            <div><p className="text-gray-400">Reorder At</p><p className="font-medium">{fmt(tank.reorderLevelLitres)} L</p></div>
            <div><p className="text-gray-400">Reorder Qty</p><p className="font-medium">{fmt(tank.reorderQtyLitres)} L</p></div>
          </div>
        </div>
      ))}
      {tanks.length === 0 && <div className="col-span-2 text-center py-10 text-gray-400 text-sm">No tanks found.</div>}
    </div>
  );
}

// ── Tab: Usage Logs ────────────────────────────────────────────────────────
function UsageLogsTab({ stationId }: { stationId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-logs', stationId],
    queryFn: () => usageApi.getLogs({ stationId, limit: 20 }),
  });
  const logs = data?.items ?? [];

  if (isLoading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {logs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No usage logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shift</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fuel</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Dispensed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sales</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{fmtDate(log.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{log.shiftType}</td>
                  <td className="px-4 py-3 text-gray-600">{log.tank.fuelType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(log.dispensedLitres)} L</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmtLkr(log.totalSalesLkr)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${log.varianceSeverity === 'critical' ? 'text-red-600' : log.varianceSeverity === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {log.varianceLitres >= 0 ? '+' : ''}{log.varianceLitres.toFixed(1)} L
                  </td>
                  <td className="px-4 py-3"><Badge status={log.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Orders ────────────────────────────────────────────────────────────
function OrdersTab({ stationId }: { stationId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders', stationId],
    queryFn: () => ordersApi.getOrders({ stationId, limit: 20 } as any),
  });
  const orders = data?.items ?? [];

  if (isLoading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {orders.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No orders found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{order.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(order.orderDate)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmtLkr(order.totalAmountLkr)}</td>
                  <td className="px-4 py-3"><Badge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Services ──────────────────────────────────────────────────────────
function ServicesTab({ stationId }: { stationId: string }) {
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['vehicle-services', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/vehicle-services/jobs', { params: { stationId, limit: 15 } });
      return data as { items: any[]; total: number };
    },
  });

  const { data: carWash, isLoading: loadingWash } = useQuery({
    queryKey: ['car-wash', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/car-wash/jobs', { params: { stationId, limit: 15 } });
      return data as { items: any[]; total: number };
    },
  });

  return (
    <div className="space-y-6">
      {/* Vehicle Services */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">Vehicle Services</h3>
        </div>
        {loadingServices ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
        ) : (services?.items ?? []).length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No vehicle services found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(services?.items ?? []).map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{job.vehicleNumber}</td>
                    <td className="px-4 py-2 text-gray-600">{job.serviceType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-gray-600">{fmtDate(job.serviceDate)}</td>
                    <td className="px-4 py-2 text-right">{fmtLkr(job.amountLkr)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{job.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Car Wash */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">Car Wash Jobs</h3>
        </div>
        {loadingWash ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
        ) : (carWash?.items ?? []).length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No car wash jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(carWash?.items ?? []).map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{job.vehicleNumber}</td>
                    <td className="px-4 py-2 text-gray-600">{job.washType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-gray-600">{fmtDate(job.washDate)}</td>
                    <td className="px-4 py-2 text-right">{fmtLkr(job.amountLkr)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{job.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Spare Parts ───────────────────────────────────────────────────────
function SparePartsTab({ stationId }: { stationId: string }) {
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['spare-parts', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/spare-parts', { params: { stationId } });
      return data as any[];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ['spare-part-sales', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/spare-parts/sales', { params: { stationId, limit: 10 } });
      return data as { items: any[]; total: number };
    },
  });

  if (isLoading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50"><h3 className="font-semibold text-gray-700 text-sm">Spare Parts Inventory</h3></div>
        {parts.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No spare parts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parts.map((part: any) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{part.sku}</td>
                    <td className="px-4 py-2 font-medium">{part.name}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{part.category}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${part.currentStock <= part.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                      {part.currentStock}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">{fmtLkr(part.unitPriceLkr)}</td>
                    <td className="px-4 py-2">
                      {part.currentStock <= part.reorderLevel ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      {(sales?.items ?? []).length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50"><h3 className="font-semibold text-gray-700 text-sm">Recent Sales</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(sales?.items ?? []).map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{fmtDate(sale.saleDate)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtLkr(sale.totalAmountLkr)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{sale.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Gas Cylinders ─────────────────────────────────────────────────────
function GasCylindersTab({ stationId }: { stationId: string }) {
  const { data: cylinders = [], isLoading } = useQuery({
    queryKey: ['cylinders', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/gas-cylinders', { params: { stationId } });
      return data as any[];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ['cylinder-sales', stationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/gas-cylinders/sales', { params: { stationId, limit: 10 } });
      return data as { items: any[]; total: number };
    },
  });

  if (isLoading) return <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cylinders.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 text-sm">No gas cylinders found.</div>}
        {cylinders.map((cyl: any) => (
          <div key={cyl.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{cyl.brand} — {cyl.sizeKg}kg</p>
                <p className="text-xs text-gray-400 mt-0.5">Selling: {fmtLkr(cyl.sellingPriceLkr)}</p>
              </div>
              {cyl.fullStock <= cyl.reorderLevel && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Low</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-gray-500">Full</p>
                <p className="font-bold text-green-700 text-lg">{cyl.fullStock}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Empty</p>
                <p className="font-bold text-gray-700 text-lg">{cyl.emptyStock}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Reorder at: {cyl.reorderLevel}</p>
          </div>
        ))}
      </div>

      {(sales?.items ?? []).length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50"><h3 className="font-semibold text-gray-700 text-sm">Recent Cylinder Sales</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Cylinder</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(sales?.items ?? []).map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{fmtDate(sale.saleDate)}</td>
                    <td className="px-4 py-2 text-gray-700">{sale.gasCylinder?.brand} {sale.gasCylinder?.sizeKg}kg</td>
                    <td className="px-4 py-2 text-right">{sale.quantity}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtLkr(sale.amountLkr)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{sale.isExchange ? 'Exchange' : 'New'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const { data: station, isLoading } = useQuery({
    queryKey: ['station', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/stations/${id}`);
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading station…</div>;
  }

  if (!station) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Station not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => router.push('/admin/stations')} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Stations
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{station.name}</h1>
            <p className="text-sm text-gray-500">{station.city}{station.address ? ` · ${station.address}` : ''}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${station.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {station.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'Overview'       && <OverviewTab stationId={id} station={station} />}
        {activeTab === 'Fuel Stock'     && <FuelStockTab stationId={id} />}
        {activeTab === 'Usage Logs'     && <UsageLogsTab stationId={id} />}
        {activeTab === 'Orders'         && <OrdersTab stationId={id} />}
        {activeTab === 'Services'       && <ServicesTab stationId={id} />}
        {activeTab === 'Spare Parts'    && <SparePartsTab stationId={id} />}
        {activeTab === 'Gas Cylinders'  && <GasCylindersTab stationId={id} />}
      </div>
    </div>
  );
}
