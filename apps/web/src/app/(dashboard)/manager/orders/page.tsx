'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders.api';
import { OrderCard } from '@/components/orders/OrderCard';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { ReorderSuggestions } from '@/components/orders/ReorderSuggestions';
import { useAuthStore } from '@/store/auth.store';

const STATUS_FILTERS = [
  { label: 'Active', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Partially Delivered', value: 'PARTIALLY_DELIVERED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function ManagerOrdersPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const stationId = user?.stationId;

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 15;

  const { data: summary } = useQuery({
    queryKey: ['order-summary', stationId],
    queryFn: () => ordersApi.getSummary(stationId),
    enabled: !!stationId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', stationId, statusFilter, page],
    queryFn: () =>
      ordersApi.getOrders({
        stationId,
        status: statusFilter || undefined,
        limit,
        offset: page * limit,
      }),
    enabled: !!stationId,
  });

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['order-summary'] });
    qc.invalidateQueries({ queryKey: ['reorder-suggestions'] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Procurement orders for your station
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            + New Order
          </button>
        </div>

        {/* Summary row */}
        {summary && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <MiniCard label="Draft" value={summary.draft} />
            <MiniCard label="Submitted" value={summary.submitted} accent />
            <MiniCard label="Approved" value={summary.approved} />
            <MiniCard label="Delivered" value={summary.delivered} />
            <MiniCard label="Cancelled" value={summary.cancelled} />
            <div className="bg-white rounded-xl border p-3 text-center col-span-1">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-xs font-bold text-blue-700 mt-0.5 leading-tight">
                LKR{' '}
                {(summary.pendingValueLkr / 1000).toLocaleString('en-LK', {
                  maximumFractionDigits: 0,
                })}
                k
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Orders list */}
          <div className="space-y-4">
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(0); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-white rounded-xl border animate-pulse" />
                ))}
              </div>
            ) : data?.items.length === 0 ? (
              <div className="bg-white rounded-xl border py-16 text-center">
                <p className="text-gray-400 text-sm">No orders found</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Create your first order
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {data?.items.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      canApprove={true}
                    />
                  ))}
                </div>

                {data && data.total > limit && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-gray-500">
                      {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * limit >= data.total}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reorder suggestions */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Low Stock Alerts
            </h2>
            <ReorderSuggestions onOrderCreated={handleCreated} />
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateOrderModal
          stationId={stationId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function MiniCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${accent ? 'text-blue-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}
