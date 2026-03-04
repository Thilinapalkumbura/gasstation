'use client';

import { useState } from 'react';
import { gasCylindersApi, GasCylinder } from '@/lib/api/gas-cylinders.api';

interface Props {
  cylinder: GasCylinder;
  stationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CylinderStockInModal({ cylinder, stationId, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [purchasePriceLkr, setPurchasePriceLkr] = useState(Number(cylinder.purchasePriceLkr));
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await gasCylindersApi.createStockIn({ stationId, gasCylinderId: cylinder.id, quantity, purchasePriceLkr, receivedAt, notes });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to record stock-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Stock In — {cylinder.brand} {Number(cylinder.sizeKg)}kg</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {error && <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (full cylinders)</label>
            <input type="number" min="1" required className="w-full border rounded-lg px-3 py-2 text-sm" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (LKR)</label>
            <input type="number" min="0.01" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" value={purchasePriceLkr} onChange={(e) => setPurchasePriceLkr(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
              {loading ? 'Saving...' : 'Record Stock In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
