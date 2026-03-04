'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taxApi } from '@/lib/api/tax.api';
import { stationsApi } from '@/lib/api/stations.api';
import { TaxSummaryCards } from '@/components/tax/TaxSummaryCards';
import { TaxEntriesTable } from '@/components/tax/TaxEntriesTable';
import { ComputeTaxModal } from '@/components/tax/ComputeTaxModal';
import { VATReturnView } from '@/components/tax/VATReturnView';
import { useAuthStore } from '@/store/auth.store';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BackofficeTaxPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Station filter — for Admin. Back-office sees their own station only
  const [stationId, setStationId] = useState<string>(user?.stationId ?? '');
  const [summaryYear, setSummaryYear] = useState(currentYear);

  // VAT return selectors
  const [vatMonth, setVatMonth] = useState(currentMonth === 1 ? 12 : currentMonth - 1);
  const [vatYear, setVatYear] = useState(currentMonth === 1 ? currentYear - 1 : currentYear);
  const [showVatReturn, setShowVatReturn] = useState(false);

  // Entries table pagination
  const [page, setPage] = useState(0);
  const limit = 10;

  // Compute modal
  const [showCompute, setShowCompute] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const effectiveStationId = stationId || user?.stationId || '';

  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: stationsApi.getAll,
    enabled: isAdmin,
  });

  // Summary
  const summaryQuery = useQuery({
    queryKey: ['tax-summary', effectiveStationId, summaryYear],
    queryFn: () => taxApi.getSummary(effectiveStationId, summaryYear),
    enabled: !!effectiveStationId,
  });

  // Entries
  const entriesQuery = useQuery({
    queryKey: ['tax-entries', effectiveStationId, page],
    queryFn: () =>
      taxApi.getEntries({
        stationId: effectiveStationId || undefined,
        limit,
        offset: page * limit,
      }),
  });

  // VAT Return
  const vatReturnQuery = useQuery({
    queryKey: ['vat-return', effectiveStationId, vatMonth, vatYear],
    queryFn: () => taxApi.getVATReturn(effectiveStationId, vatMonth, vatYear),
    enabled: showVatReturn && !!effectiveStationId,
  });

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax / IRD</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Sri Lanka IRD-compliant tax records — VAT, WHT, Income Tax
            </p>
          </div>
          <button
            onClick={() => setShowCompute(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            + Compute Tax
          </button>
        </div>

        {/* Station + Year selector */}
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4">
          <div className="flex flex-wrap gap-4 items-end">
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
                <select
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All stations</option>
                  {stationsQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Summary Year</label>
              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(parseInt(e.target.value, 10))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryQuery.isLoading && (
          <div className="h-32 bg-white rounded-xl border shadow-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {summaryQuery.data && <TaxSummaryCards data={summaryQuery.data} />}

        {/* VAT Return Section */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="text-base font-semibold text-gray-900">IRD VAT Return (VAT-01)</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={vatMonth}
                onChange={(e) => setVatMonth(parseInt(e.target.value, 10))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={vatYear}
                onChange={(e) => setVatYear(parseInt(e.target.value, 10))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setShowVatReturn(true);
                  qc.invalidateQueries({ queryKey: ['vat-return', effectiveStationId, vatMonth, vatYear] });
                }}
                disabled={!effectiveStationId}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Generate VAT-01
              </button>
            </div>
          </div>

          {showVatReturn && (
            <>
              {vatReturnQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {vatReturnQuery.isError && (
                <p className="text-sm text-red-600 py-4">Failed to load VAT return. Check station ID and date.</p>
              )}
              {vatReturnQuery.data && <VATReturnView data={vatReturnQuery.data} />}
            </>
          )}

          {!showVatReturn && (
            <div className="py-6 text-center text-sm text-gray-400">
              Select a month and year then click "Generate VAT-01" to view the IRD return.
            </div>
          )}
        </div>

        {/* Tax Entries Table */}
        {entriesQuery.isLoading && (
          <div className="bg-white rounded-xl border shadow-sm p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {entriesQuery.data && (
          <TaxEntriesTable
            entries={entriesQuery.data.items}
            total={entriesQuery.data.total}
            page={page}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Compute Tax Modal */}
      {showCompute && (
        <ComputeTaxModal
          stationId={effectiveStationId}
          onClose={() => setShowCompute(false)}
        />
      )}
    </div>
  );
}
