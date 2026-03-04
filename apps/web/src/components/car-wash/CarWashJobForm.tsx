'use client';

import { useState } from 'react';
import { carWashApi, CreateCarWashJobPayload } from '@/lib/api/car-wash.api';

const WASH_TYPES = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'FULL_DETAIL', label: 'Full Detail' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
];

interface Props {
  stationId: string;
  onSuccess?: () => void;
}

export function CarWashJobForm({ stationId, onSuccess }: Props) {
  const [form, setForm] = useState<Omit<CreateCarWashJobPayload, 'stationId'>>({
    vehicleNumber: '',
    washType: 'BASIC',
    amountLkr: 0,
    paymentMethod: 'CASH',
    washDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await carWashApi.createJob({ ...form, stationId });
      setSuccess(true);
      setForm((f) => ({ ...f, vehicleNumber: '', amountLkr: 0, notes: '' }));
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to record car wash job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">Car wash job recorded.</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
        <input
          type="text"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. CAR-1234"
          value={form.vehicleNumber}
          onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Wash Type</label>
        <select
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.washType}
          onChange={(e) => setForm((f) => ({ ...f, washType: e.target.value }))}
        >
          {WASH_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.amountLkr || ''}
          onChange={(e) => setForm((f) => ({ ...f, amountLkr: parseFloat(e.target.value) || 0 }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.paymentMethod}
          onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
        >
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.washDate}
          onChange={(e) => setForm((f) => ({ ...f, washDate: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Recording...' : 'Record Car Wash'}
      </button>
    </form>
  );
}
