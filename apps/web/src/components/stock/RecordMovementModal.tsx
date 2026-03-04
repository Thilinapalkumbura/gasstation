'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { stockApi, TankSnapshot } from '@/lib/api/stock.api';

const schema = z.object({
  type: z.enum(['DELIVERY_IN', 'DISPENSED_OUT', 'ADJUSTMENT']),
  quantityLitres: z.number().positive('Must be positive'),
  unitCostLkr: z.number().positive().optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  tank: TankSnapshot;
  onClose: () => void;
}

const MOVEMENT_LABELS: Record<string, string> = {
  DELIVERY_IN: 'Delivery In',
  DISPENSED_OUT: 'Dispensed Out',
  ADJUSTMENT: 'Stock Adjustment',
};

export function RecordMovementModal({ tank, onClose }: Props) {
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'DELIVERY_IN' },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await stockApi.recordMovement({ tankId: tank.id, ...data });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record movement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Record Stock Movement</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {tank.fuelType.replace('_', ' ')} · {tank.station?.name} · {tank.currentLevelLitres.toLocaleString()}L current
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(MOVEMENT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (litres)</label>
            <input
              {...register('quantityLitres', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="e.g. 5000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.quantityLitres && (
              <p className="mt-1 text-xs text-red-600">{errors.quantityLitres.message}</p>
            )}
          </div>

          {/* Unit cost — only for DELIVERY_IN */}
          {selectedType === 'DELIVERY_IN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Cost (LKR/litre) <span className="text-gray-400 font-normal">— for stock valuation</span>
              </label>
              <input
                {...register('unitCostLkr', { valueAsNumber: true })}
                type="number"
                step="0.0001"
                placeholder="e.g. 340.50"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference <span className="text-gray-400 font-normal">(PO no., GRN, shift ID)</span>
            </label>
            <input
              {...register('reference')}
              type="text"
              placeholder="e.g. PO-2024-0001"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
