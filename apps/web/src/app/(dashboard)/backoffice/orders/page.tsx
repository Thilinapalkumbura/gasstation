'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders.api';
import { OrderCard } from '@/components/orders/OrderCard';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { ReorderSuggestions } from '@/components/orders/ReorderSuggestions';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Partially Delivered', value: 'PARTIALLY_DELIVERED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function BackofficeOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showReorder, setShowReorder] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: summary } = useQuery({
    queryKey: ['order-summary'],
    queryFn: () => ordersApi.getSummary(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, page],
    queryFn: () =>
      ordersApi.getOrders({
        status: statusFilter || undefined,
        limit,
        offset: page * limit,
      }),
  });

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['order-summary'] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage procurement across all fuel stations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReorder((v) => !v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                showReorder
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Reorder Alerts
              {summary && summary.submitted > 0 && (
                <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {summary.submitted}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              + New Order
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Draft" value={summary.draft} color="gray" />
            <SummaryCard label="Submitted" value={summary.submitted} color="blue" />
            <SummaryCard label="Approved" value={summary.approved} color="purple" />
            <SummaryCard label="Delivered" value={summary.delivered} color="emerald" />
            <SummaryCard label="Cancelled" value={summary.cancelled} color="red" />
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-xs text-gray-500">Pending Value</div>
              <div className="text-sm font-bold text-blue-700 mt-0.5 leading-tight">
                LKR{' '}
                {summary.pendingValueLkr.toLocaleString('en-LK', {
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Orders list */}
          <div className="space-y-4">
            {/* Filters */}
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
                  <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />
                ))}
              </div>
            ) : data?.items.length === 0 ? (
              <div className="bg-white rounded-xl border py-16 text-center">
                <p className="text-gray-400 text-sm">No orders found</p>
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

                {/* Pagination */}
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

          {/* Reorder suggestions sidebar */}
          {showReorder && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Reorder Alerts
              </h2>
              <ReorderSuggestions onOrderCreated={handleCreated} />
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label, value, color,
}: {
  label: string;
  value: number;
  color: 'gray' | 'blue' | 'purple' | 'emerald' | 'red';
}) {
  const colorMap = {
    gray: 'text-gray-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    emerald: 'text-emerald-700',
    red: 'text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${colorMap[color]}`}>{value}</div>
    </div>
  );
}
