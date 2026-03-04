'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxEntry, taxApi } from '@/lib/api/tax.api';

interface Props {
  entries: TaxEntry[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const TAX_LABELS: Record<string, string> = {
  VAT: 'VAT',
  WHT: 'WHT',
  INCOME_TAX: 'Income Tax',
  ESC: 'ESC',
  PAYE: 'PAYE',
};

function MarkPaidModal({
  entry,
  onClose,
}: {
  entry: TaxEntry;
  onClose: () => void;
}) {
  const [ref, setRef] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => taxApi.markPaid(entry.id, ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-entries'] });
      qc.invalidateQueries({ queryKey: ['tax-summary'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Mark as Paid</h3>
        <p className="text-sm text-gray-500 mb-4">
          {TAX_LABELS[entry.taxType]} — {formatDate(entry.periodStart)} to {formatDate(entry.periodEnd)}
        </p>
        <p className="text-sm font-medium text-gray-700 mb-1">
          Amount: {lkr(entry.netTaxPayableLkr)}
        </p>
        <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">
          IRD Filing Reference *
        </label>
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="e.g. IRD-2025-04-VAT-001"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!ref.trim() || mutation.isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Confirm Paid'}
          </button>
        </div>
        {mutation.isError && (
          <p className="text-xs text-red-600 mt-2">Failed to mark as paid. Try again.</p>
        )}
      </div>
    </div>
  );
}

export function TaxEntriesTable({ entries, total, page, limit, onPageChange }: Props) {
  const [markingEntry, setMarkingEntry] = useState<TaxEntry | null>(null);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Tax Entries</h3>
        <span className="text-xs text-gray-500">{total} total</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Type', 'Period', 'Station', 'Taxable Amt', 'Tax Amt', 'Input Tax', 'Net Payable', 'Status', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  No tax entries found
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {TAX_LABELS[entry.taxType] ?? entry.taxType}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {formatDate(entry.periodStart)}<br />
                  <span className="text-gray-400">→ {formatDate(entry.periodEnd)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {entry.station?.name ?? entry.stationId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                  {lkr(entry.taxableAmountLkr)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                  {lkr(entry.taxAmountLkr)}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                  {lkr(entry.inputTaxLkr)}
                </td>
                <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900 whitespace-nowrap">
                  {lkr(entry.netTaxPayableLkr)}
                </td>
                <td className="px-4 py-3">
                  {entry.isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!entry.isPaid && (
                    <button
                      onClick={() => setMarkingEntry(entry)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                    >
                      Mark Paid
                    </button>
                  )}
                  {entry.isPaid && entry.filingReference && (
                    <span className="text-xs text-gray-400 font-mono">{entry.filingReference}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {markingEntry && (
        <MarkPaidModal entry={markingEntry} onClose={() => setMarkingEntry(null)} />
      )}
    </div>
  );
}
