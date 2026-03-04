'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PurchaseOrder, ordersApi } from '@/lib/api/orders.api';
import { stockApi } from '@/lib/api/stock.api';

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

interface GRNItemForm {
  fuelType: string;
  orderedQtyLitres: number;
  receivedQtyLitres: string;
  pricePerLitreLkr: string;
}

interface Props {
  order: PurchaseOrder;
  onClose: () => void;
}

export function GRNModal({ order, onClose }: Props) {
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  const { data: tanks } = useQuery({
    queryKey: ['tanks', order.station.id],
    queryFn: () => stockApi.getTanks(order.station.id),
  });

  // Build a map of fuelType → availableLitres
  const availableByFuel: Record<string, number> = {};
  tanks?.forEach((t) => { availableByFuel[t.fuelType] = t.availableLitres; });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNItemForm[]>(
    order.items.map((item) => ({
      fuelType: item.fuelType,
      orderedQtyLitres: item.quantityLitres - item.deliveredLitres,
      receivedQtyLitres: String(item.quantityLitres - item.deliveredLitres),
      pricePerLitreLkr: String(item.pricePerLitreLkr),
    })),
  );

  const mutation = useMutation({
    mutationFn: () =>
      ordersApi.createGRN({
        purchaseOrderId: order.id,
        receivedAt: new Date(receivedAt).toISOString(),
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          fuelType: it.fuelType,
          orderedQtyLitres: it.orderedQtyLitres,
          receivedQtyLitres: parseFloat(it.receivedQtyLitres),
          pricePerLitreLkr: parseFloat(it.pricePerLitreLkr),
        })),
      }),
    onSuccess: onClose,
  });

  const updateItem = (index: number, field: keyof GRNItemForm, value: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  };

  const totalReceived = items.reduce((sum, it) => {
    const qty = parseFloat(it.receivedQtyLitres) || 0;
    const price = parseFloat(it.pricePerLitreLkr) || 0;
    return sum + qty * price;
  }, 0);

  const isValid = items.every((it) => {
    const qty = parseFloat(it.receivedQtyLitres);
    const price = parseFloat(it.pricePerLitreLkr);
    const available = availableByFuel[it.fuelType];
    return qty > 0 && price > 0 && (available === undefined || qty <= available);
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Record Delivery (GRN)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Received date/time */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Delivery Date & Time
            </label>
            <input
              type="datetime-local"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Received Quantities
            </h3>
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={item.fuelType} className="bg-gray-50 rounded-xl p-4">
                  <div className="font-medium text-sm text-gray-900 mb-3">
                    {FUEL_LABELS[item.fuelType] ?? item.fuelType}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Ordered: {item.orderedQtyLitres.toLocaleString()}L remaining)
                    </span>
                    {availableByFuel[item.fuelType] !== undefined && (
                      <span className={`ml-2 text-xs font-medium ${
                        parseFloat(item.receivedQtyLitres) > availableByFuel[item.fuelType]
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}>
                        · Tank space: {availableByFuel[item.fuelType].toLocaleString()}L
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Received Qty (Litres)
                        {availableByFuel[item.fuelType] !== undefined && (
                          <span className="ml-1 text-gray-400">
                            (max {availableByFuel[item.fuelType].toLocaleString()}L)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max={availableByFuel[item.fuelType]}
                        step="0.01"
                        value={item.receivedQtyLitres}
                        onChange={(e) =>
                          updateItem(i, 'receivedQtyLitres', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                          availableByFuel[item.fuelType] !== undefined &&
                          parseFloat(item.receivedQtyLitres) > availableByFuel[item.fuelType]
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Actual Price / L (LKR)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.0001"
                        value={item.pricePerLitreLkr}
                        onChange={(e) =>
                          updateItem(i, 'pricePerLitreLkr', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        placeholder="0.0000"
                      />
                    </div>
                  </div>
                  {parseFloat(item.receivedQtyLitres) > 0 &&
                    parseFloat(item.pricePerLitreLkr) > 0 && (
                      <div className="mt-2 text-xs text-emerald-700 font-medium text-right">
                        Line total: LKR{' '}
                        {(
                          parseFloat(item.receivedQtyLitres) *
                          parseFloat(item.pricePerLitreLkr)
                        ).toLocaleString('en-LK', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Delivery Notes (docket no., driver details…)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="Optional — invoice number, driver, truck plate…"
            />
          </div>

          {/* Total */}
          {totalReceived > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-800">
                Total GRN Amount
              </span>
              <span className="text-base font-bold text-emerald-700">
                LKR{' '}
                {totalReceived.toLocaleString('en-LK', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
              {(mutation.error as any)?.response?.data?.message
                ?? 'Failed to save GRN. Please check the values and try again.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:bg-orange-300"
          >
            {mutation.isPending ? 'Saving…' : 'Save GRN & Update Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
