'use client';

import { useState } from 'react';
import { sparePartsApi, SparePart } from '@/lib/api/spare-parts.api';
import { QrScannerModal } from './QrScannerModal';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
];

interface SaleItem { sparePartId: string; quantity: number; unitPriceLkr: number; partName: string; }

interface Props {
  stationId: string;
  parts: SparePart[];
  onSuccess?: () => void;
}

export function SparePartSaleForm({ stationId, parts, onSuccess }: Props) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedPart, setSelectedPart] = useState('');
  const [qty, setQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');

  function addItemById(partId: string, quantity: number) {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.sparePartId === part.id);
      if (existing) return prev.map((i) => i.sparePartId === part.id ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { sparePartId: part.id, quantity, unitPriceLkr: Number(part.unitPriceLkr), partName: part.name }];
    });
  }

  const addItem = () => {
    addItemById(selectedPart, qty);
    setSelectedPart('');
    setQty(1);
  };

  function handleScan(scannedValue: string) {
    // QR encodes the SKU — look it up in the loaded parts list
    const matched = parts.find(
      (p) => p.sku.toLowerCase() === scannedValue.toLowerCase(),
    );
    if (matched) {
      addItemById(matched.id, 1);
      setScanFeedback(`✓ Added: ${matched.name} (${matched.sku})`);
    } else {
      setScanFeedback(`Part not found for SKU: "${scannedValue}"`);
    }
    // Clear feedback after 4 s
    setTimeout(() => setScanFeedback(''), 4000);
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitPriceLkr, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) { setError('Add at least one item'); return; }
    setLoading(true);
    setError('');
    try {
      await sparePartsApi.createSale({
        stationId,
        paymentMethod,
        saleDate,
        items: items.map(({ sparePartId, quantity, unitPriceLkr }) => ({ sparePartId, quantity, unitPriceLkr })),
        notes,
      });
      setSuccess(true);
      setItems([]);
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">Sale recorded.</div>}

        {/* QR scan feedback */}
        {scanFeedback && (
          <div className={`p-3 rounded text-sm ${scanFeedback.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {scanFeedback}
          </div>
        )}

        {/* Part picker row + Scan button */}
        <div className="flex gap-2">
          <select
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={selectedPart}
            onChange={(e) => setSelectedPart(e.target.value)}
          >
            <option value="">Select part...</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — Rs.{Number(p.unitPriceLkr).toLocaleString()} (stock: {p.currentStock})</option>
            ))}
          </select>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="w-20 border rounded-lg px-3 py-2 text-sm" />
          <button type="button" onClick={addItem} disabled={!selectedPart} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">Add</button>
          {/* QR scan button */}
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5 whitespace-nowrap"
            title="Scan QR code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan
          </button>
        </div>

        {items.length > 0 && (
          <div className="border rounded-lg divide-y text-sm">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-3 py-2">
                <span>{item.partName} x{item.quantity}</span>
                <div className="flex items-center gap-3">
                  <span>Rs. {(item.quantity * item.unitPriceLkr).toLocaleString()}</span>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
            <div className="px-3 py-2 font-medium flex justify-between bg-gray-50">
              <span>Total</span>
              <span>Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

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

        <button type="submit" disabled={loading || !items.length} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Recording...' : `Record Sale — Rs. ${total.toLocaleString()}`}
        </button>
      </form>

      {scanOpen && (
        <QrScannerModal
          onScan={handleScan}
          onClose={() => setScanOpen(false)}
        />
      )}
    </>
  );
}
