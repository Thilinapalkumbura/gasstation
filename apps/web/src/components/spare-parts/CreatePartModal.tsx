'use client';

import { useState } from 'react';
import { sparePartsApi } from '@/lib/api/spare-parts.api';
import { QrScannerModal } from './QrScannerModal';

interface Props {
  stationId: string;
  onSuccess: () => void;
  onClose: () => void;
  prefillSku?: string; // optionally pre-filled from QR scan
}

export function CreatePartModal({ stationId, onSuccess, onClose, prefillSku }: Props) {
  const [sku, setSku] = useState(prefillSku ?? '');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  function handleScan(value: string) {
    setSku(value.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sku || !name || !unitPrice || !costPrice) {
      setError('SKU, Name, Unit Price and Cost Price are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sparePartsApi.createPart({
        stationId,
        sku,
        name,
        brand: brand || undefined,
        category: category || undefined,
        unitPriceLkr: parseFloat(unitPrice),
        costPriceLkr: parseFloat(costPrice),
        reorderLevel: parseInt(reorderLevel) || 5,
      } as any);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create part');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Add New Spare Part</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

            {/* SKU with scan button */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. OIL-FILTER-001"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5"
                  title="Scan QR to fill SKU"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan
                </button>
              </div>
              {sku && (
                <p className="text-xs text-blue-600 mt-1">SKU: {sku}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Part Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oil Filter Toyota"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Bosch"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Filters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price (LKR) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price (LKR) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
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
                {loading ? 'Adding...' : 'Add Part'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {scanOpen && (
        <QrScannerModal
          onScan={handleScan}
          onClose={() => setScanOpen(false)}
        />
      )}
    </>
  );
}
