'use client';

import { useState } from 'react';
import { gasCylindersApi } from '@/lib/api/gas-cylinders.api';

const CYLINDER_BRANDS = ['LAUGFS', 'SHELL', 'OTHER'];
const COMMON_SIZES = [2.3, 5, 12.5, 37.5];

interface Props {
  stationId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateCylinderModal({ stationId, onSuccess, onClose }: Props) {
  const [brand, setBrand] = useState('LAUGFS');
  const [sizeKg, setSizeKg] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [fullStock, setFullStock] = useState('0');
  const [emptyStock, setEmptyStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sizeKg || !sellingPrice || !purchasePrice) {
      setError('Size, Selling Price and Purchase Price are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await gasCylindersApi.createCylinder({
        stationId,
        brand: brand as any,
        sizeKg: parseFloat(sizeKg),
        sellingPriceLkr: parseFloat(sellingPrice),
        purchasePriceLkr: parseFloat(purchasePrice),
        fullStock: parseInt(fullStock) || 0,
        emptyStock: parseInt(emptyStock) || 0,
        reorderLevel: parseInt(reorderLevel) || 5,
      } as any);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create cylinder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Add Gas Cylinder</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand *</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CYLINDER_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Size (kg) *</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={sizeKg}
                  onChange={(e) => setSizeKg(e.target.value)}
                  placeholder="e.g. 12.5"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {COMMON_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSizeKg(String(s))}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {s}kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (LKR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price (LKR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Stock</label>
              <input
                type="number"
                min="0"
                value={fullStock}
                onChange={(e) => setFullStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Empty Stock</label>
              <input
                type="number"
                min="0"
                value={emptyStock}
                onChange={(e) => setEmptyStock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-sm text-gray-700 rounded-lg py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white text-sm rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Cylinder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
