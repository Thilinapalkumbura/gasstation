'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders.api';

const FUEL_TYPES = [
  { value: 'PETROL_92', label: 'Petrol 92' },
  { value: 'PETROL_95', label: 'Petrol 95' },
  { value: 'AUTO_DIESEL', label: 'Auto Diesel' },
  { value: 'SUPER_DIESEL', label: 'Super Diesel' },
  { value: 'KEROSENE', label: 'Kerosene' },
];

interface OrderItemForm {
  id: number;
  fuelType: string;
  quantityLitres: string;
  pricePerLitreLkr: string;
}

interface Props {
  stationId?: string;         // pre-fill if opened from a specific station context
  prefillItems?: { fuelType: string; quantity: number }[];
  onClose: () => void;
  onCreated: () => void;
}

let _itemId = 0;
const nextId = () => ++_itemId;

export function CreateOrderModal({ stationId, prefillItems, onClose, onCreated }: Props) {
  const [selectedStationId, setSelectedStationId] = useState(stationId ?? '');
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>(() => {
    if (prefillItems && prefillItems.length > 0) {
      return prefillItems.map((p) => ({
        id: nextId(),
        fuelType: p.fuelType,
        quantityLitres: String(p.quantity),
        pricePerLitreLkr: '',
      }));
    }
    return [{ id: nextId(), fuelType: 'PETROL_92', quantityLitres: '', pricePerLitreLkr: '' }];
  });

  const { data: stations } = useQuery({
    queryKey: ['stations-list'],
    queryFn: () => ordersApi.getStations(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => ordersApi.getSuppliers(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      ordersApi.createOrder({
        stationId: selectedStationId,
        supplierId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          fuelType: it.fuelType,
          quantityLitres: parseFloat(it.quantityLitres),
          pricePerLitreLkr: parseFloat(it.pricePerLitreLkr),
        })),
      }),
    onSuccess: () => { onCreated(); onClose(); },
  });

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: nextId(), fuelType: 'AUTO_DIESEL', quantityLitres: '', pricePerLitreLkr: '' },
    ]);

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const updateItem = (id: number, field: keyof Omit<OrderItemForm, 'id'>, value: string) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );

  const total = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantityLitres) || 0;
    const price = parseFloat(it.pricePerLitreLkr) || 0;
    return sum + qty * price;
  }, 0);

  const usedFuelTypes = items.map((it) => it.fuelType);

  const isValid =
    selectedStationId &&
    supplierId &&
    orderDate &&
    items.length > 0 &&
    items.every(
      (it) =>
        it.fuelType &&
        parseFloat(it.quantityLitres) > 0 &&
        parseFloat(it.pricePerLitreLkr) > 0,
    );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Create Purchase Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Station & Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Station *</label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                disabled={!!stationId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
              >
                <option value="">Select station…</option>
                {stations?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select supplier…</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Order Date *</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expected Delivery
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                min={orderDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Order Items
              </h3>
              <button
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const availableFuelTypes = FUEL_TYPES.filter(
                  (ft) => ft.value === item.fuelType || !usedFuelTypes.includes(ft.value),
                );
                return (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fuel Type</label>
                        <select
                          value={item.fuelType}
                          onChange={(e) => updateItem(item.id, 'fuelType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                        >
                          {availableFuelTypes.map((ft) => (
                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantity (L)</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantityLitres}
                          onChange={(e) => updateItem(item.id, 'quantityLitres', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Price / L (LKR)</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.0001"
                          value={item.pricePerLitreLkr}
                          onChange={(e) => updateItem(item.id, 'pricePerLitreLkr', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                          placeholder="0.0000"
                        />
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="mb-0.5 text-red-400 hover:text-red-600 disabled:opacity-30 px-2 py-2"
                      >
                        ✕
                      </button>
                    </div>
                    {parseFloat(item.quantityLitres) > 0 &&
                      parseFloat(item.pricePerLitreLkr) > 0 && (
                        <div className="mt-2 text-xs text-blue-700 font-medium text-right">
                          Line total: LKR{' '}
                          {(
                            parseFloat(item.quantityLitres) *
                            parseFloat(item.pricePerLitreLkr)
                          ).toLocaleString('en-LK', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-400"
              placeholder="Optional order notes…"
            />
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Order Total</span>
              <span className="text-base font-bold text-blue-700">
                LKR{' '}
                {total.toLocaleString('en-LK', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
              Failed to create order. Please check the values and try again.
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
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {mutation.isPending ? 'Creating…' : 'Create Draft Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
