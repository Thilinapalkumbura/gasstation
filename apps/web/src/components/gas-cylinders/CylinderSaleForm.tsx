'use client';

import { useState } from 'react';
import { gasCylindersApi, GasCylinder } from '@/lib/api/gas-cylinders.api';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
];

interface Props {
  stationId: string;
  cylinders: GasCylinder[];
  onSuccess?: () => void;
}

export function CylinderSaleForm({ stationId, cylinders, onSuccess }: Props) {
  const [gasCylinderId, setGasCylinderId] = useState('');
  const [isExchange, setIsExchange] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [amountLkr, setAmountLkr] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedCylinder = cylinders.find((c) => c.id === gasCylinderId);

  const handleCylinderChange = (id: string) => {
    setGasCylinderId(id);
    const c = cylinders.find((c) => c.id === id);
    if (c) setAmountLkr(Number(c.sellingPriceLkr) * quantity);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await gasCylindersApi.createSale({ stationId, gasCylinderId, isExchange, quantity, amountLkr, paymentMethod, saleDate, notes });
      setSuccess(true);
      setGasCylinderId('');
      setQuantity(1);
      setAmountLkr(0);
      setNotes('');
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">Sale recorded.</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cylinder</label>
        <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={gasCylinderId} onChange={(e) => handleCylinderChange(e.target.value)}>
          <option value="">Select cylinder...</option>
          {cylinders.map((c) => (
            <option key={c.id} value={c.id}>{c.brand} {Number(c.sizeKg)}kg — Rs.{Number(c.sellingPriceLkr).toLocaleString()} (full: {c.fullStock})</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="saleType" checked={isExchange} onChange={() => setIsExchange(true)} />
          <span className="text-sm">Exchange</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="saleType" checked={!isExchange} onChange={() => setIsExchange(false)} />
          <span className="text-sm">New Sale</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" min="1" required className="w-full border rounded-lg px-3 py-2 text-sm" value={quantity} onChange={(e) => { const q = parseInt(e.target.value) || 1; setQuantity(q); if (selectedCylinder) setAmountLkr(Number(selectedCylinder.sellingPriceLkr) * q); }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
          <input type="number" min="0.01" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" value={amountLkr || ''} onChange={(e) => setAmountLkr(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </div>
      </div>

      <button type="submit" disabled={loading || !gasCylinderId} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Recording...' : 'Record Sale'}
      </button>
    </form>
  );
}
