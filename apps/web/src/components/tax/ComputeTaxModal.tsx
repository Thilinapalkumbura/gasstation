'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taxApi, TaxType } from '@/lib/api/tax.api';
import { stationsApi } from '@/lib/api/stations.api';

interface Props {
  stationId: string;
  onClose: () => void;
}

const TAX_TYPES: { value: TaxType; label: string; description: string }[] = [
  { value: 'VAT', label: 'VAT (18%)', description: 'Monthly output/input VAT computation' },
  { value: 'WHT', label: 'WHT (5%)', description: 'Withholding tax on operating expense payments' },
  { value: 'INCOME_TAX', label: 'Income Tax (30%)', description: 'Annual corporate income tax estimate' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function ComputeTaxModal({ stationId: propStationId, onClose }: Props) {
  const now = new Date();
  const [taxType, setTaxType] = useState<TaxType>('VAT');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedStationId, setSelectedStationId] = useState('');
  const [stationError, setStationError] = useState('');
  const qc = useQueryClient();

  const needsStationPicker = !propStationId;
  const effectiveStationId = propStationId || selectedStationId;

  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: stationsApi.getAll,
    enabled: needsStationPicker,
  });

  const mutation = useMutation({
    mutationFn: () => taxApi.computeTax({ stationId: effectiveStationId, taxType, month, year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-entries'] });
      qc.invalidateQueries({ queryKey: ['tax-summary'] });
      onClose();
    },
  });

  function handleCompute() {
    if (!effectiveStationId) {
      setStationError('Please select a station');
      return;
    }
    setStationError('');
    mutation.mutate();
  }

  const isAnnual = taxType === 'INCOME_TAX';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Compute Tax</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Station picker — only shown for admin (no pre-filled stationId) */}
        {needsStationPicker && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
            {stationsQuery.isLoading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedStationId}
                onChange={(e) => { setSelectedStationId(e.target.value); setStationError(''); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  stationError ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">Select a station…</option>
                {stationsQuery.data?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                ))}
              </select>
            )}
            {stationError && <p className="text-xs text-red-600 mt-1">{stationError}</p>}
          </div>
        )}

        {/* Tax Type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Tax Type</label>
          <div className="space-y-2">
            {TAX_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  taxType === t.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="taxType"
                  value={t.value}
                  checked={taxType === t.value}
                  onChange={() => setTaxType(t.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Period */}
        <div className={`grid gap-3 mb-5 ${isAnnual ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!isAnnual && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {isAnnual ? 'Fiscal Year' : 'Year'}
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {mutation.isError && (
          <p className="text-xs text-red-600 mb-3">Computation failed. Please try again.</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCompute}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Computing…' : 'Compute'}
          </button>
        </div>
      </div>
    </div>
  );
}
