'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi, TankSnapshot } from '@/lib/api/stock.api';
import { usageApi } from '@/lib/api/usage.api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const SHIFT_HOURS: Record<string, string> = {
  MORNING: '06:00 – 14:00',
  EVENING: '14:00 – 22:00',
  NIGHT:   '22:00 – 06:00',
};

function detectCurrentShift(): 'MORNING' | 'EVENING' | 'NIGHT' {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'MORNING';
  if (h >= 14 && h < 22) return 'EVENING';
  return 'NIGHT';
}

const tankEntrySchema = z.object({
  tankId: z.string(),
  fuelType: z.string(),
  openingMeterReading: z.number().min(0),
  closingMeterReading: z.number().min(0),
  openingStockLitres: z.number().min(0),
  closingStockLitres: z.number().min(0),
  pricePerLitreLkr: z.number().positive('Price must be positive'),
  cashSalesLkr: z.number().min(0),
  creditSalesLkr: z.number().min(0),
  workerNotes: z.string().max(1000).optional(),
});

const formSchema = z.object({
  shiftType: z.enum(['MORNING', 'EVENING', 'NIGHT']),
  date: z.string(),
  tanks: z.array(tankEntrySchema).min(1),
});

type FormData = z.infer<typeof formSchema>;
type TankEntry = z.infer<typeof tankEntrySchema>;

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

interface Props {
  onSuccess?: () => void;
}

export function ShiftEntryForm({ onSuccess }: Props) {
  const user = useAuthStore((s) => s.user);
  const stationId = user?.stationId ?? '';
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'tanks' | 'review'>('details');
  const [submitError, setSubmitError] = useState('');
  const [activeTankIdx, setActiveTankIdx] = useState(0);
  const [validationError, setValidationError] = useState('');

  const { data: tanksData } = useQuery({
    queryKey: ['tanks', stationId],
    queryFn: () => stockApi.getTanks(stationId),
    enabled: !!stationId,
  });
  const tanks: TankSnapshot[] = tanksData ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shiftType: detectCurrentShift(),
      date: today,
      tanks: [],
    },
  });

  const { fields, append, replace } = useFieldArray({ control, name: 'tanks' });

  // When tanks load, init field array
  useEffect(() => {
    if (tanks.length && fields.length === 0) {
      replace(
        tanks.map((t) => ({
          tankId: t.id,
          fuelType: t.fuelType,
          openingMeterReading: 0,
          closingMeterReading: 0,
          openingStockLitres: t.currentLevelLitres,
          closingStockLitres: 0,
          pricePerLitreLkr: 0,
          cashSalesLkr: 0,
          creditSalesLkr: 0,
          workerNotes: '',
        })),
      );
    }
  }, [tanks]);

  const watchedTanks = watch('tanks');
  const watchedShift = watch('shiftType');
  const watchedDate = watch('date');

  // Auto-fetch opening stock suggestion when shift/date changes
  const fetchSuggestion = async (idx: number) => {
    const t = watchedTanks[idx];
    if (!t?.tankId || !watchedShift || !watchedDate) return;
    try {
      const s = await usageApi.getOpeningSuggestion(t.tankId, watchedShift, watchedDate);
      setValue(`tanks.${idx}.openingStockLitres`, s.openingStockLitres);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    watchedTanks.forEach((_, idx) => fetchSuggestion(idx));
  }, [watchedShift, watchedDate]);

  // Calculated preview for active tank
  const activeTank = watchedTanks[activeTankIdx];
  const dispensed = activeTank
    ? Math.max(0, (activeTank.closingMeterReading ?? 0) - (activeTank.openingMeterReading ?? 0))
    : 0;
  const physicalDispensed = activeTank
    ? Math.max(0, (activeTank.openingStockLitres ?? 0) - (activeTank.closingStockLitres ?? 0))
    : 0;
  const variance = dispensed - physicalDispensed;
  const totalSales = activeTank
    ? (activeTank.cashSalesLkr ?? 0) + (activeTank.creditSalesLkr ?? 0)
    : 0;

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Submit one log per tank sequentially
      const results = [];
      for (const tank of data.tanks) {
        const result = await usageApi.submitLog({
          tankId: tank.tankId,
          shiftType: data.shiftType,
          date: data.date,
          openingMeterReading: tank.openingMeterReading,
          closingMeterReading: tank.closingMeterReading,
          openingStockLitres: tank.openingStockLitres,
          closingStockLitres: tank.closingStockLitres,
          pricePerLitreLkr: tank.pricePerLitreLkr,
          cashSalesLkr: tank.cashSalesLkr,
          creditSalesLkr: tank.creditSalesLkr,
          workerNotes: tank.workerNotes,
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-logs'] });
      onSuccess?.();
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message || 'Failed to submit shift log');
    },
  });

  if (!tanks.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        No tanks configured for your station. Contact your manager.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center gap-0">
        {(['details', 'tanks', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
              step === s
                ? 'bg-blue-600 border-blue-600 text-white'
                : ['details', 'tanks', 'review'].indexOf(step) > i
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-white border-gray-300 text-gray-400',
            )}>
              {['details', 'tanks', 'review'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 2 && <div className={cn('h-0.5 w-12 sm:w-24', i < ['details', 'tanks', 'review'].indexOf(step) ? 'bg-emerald-500' : 'bg-gray-200')} />}
          </div>
        ))}
        <div className="ml-4 text-sm text-gray-500 font-medium capitalize">{step}</div>
      </div>

      <form onSubmit={handleSubmit((d) => { setValidationError(''); setStep('review'); }, (errs) => {
        const badTanks = (errs.tanks ?? [])
          .map((e: any, i: number) => e ? FUEL_LABELS[watchedTanks[i]?.fuelType] ?? watchedTanks[i]?.fuelType : null)
          .filter(Boolean);
        setValidationError(`Please complete all fields for: ${badTanks.join(', ')}`);
      })} className="space-y-6">

        {/* ── Step 1: Shift Details ─────────────────────────────────────── */}
        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Shift Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['MORNING', 'EVENING', 'NIGHT'] as const).map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" {...register('shiftType')} value={s} className="sr-only" />
                    <div className={cn(
                      'border-2 rounded-xl p-3 text-center transition-all',
                      watchedShift === s
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}>
                      <div className="text-xl mb-1">{s === 'MORNING' ? '🌅' : s === 'EVENING' ? '🌆' : '🌙'}</div>
                      <div className="text-xs font-semibold">{s}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{SHIFT_HOURS[s]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                {...register('date')}
                type="date"
                max={today}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep('tanks')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm"
            >
              Next — Enter Tank Readings →
            </button>
          </div>
        )}

        {/* ── Step 2: Per-tank readings ─────────────────────────────────── */}
        {step === 'tanks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Tank Readings</h2>
              <span className="text-sm text-gray-500">
                {watchedShift} · {watchedDate}
              </span>
            </div>

            {/* Tank tab selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {fields.map((f, idx) => {
                const t = watchedTanks[idx];
                const hasErr = !!(errors.tanks?.[idx]);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveTankIdx(idx)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      activeTankIdx === idx
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : hasErr
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {FUEL_LABELS[t?.fuelType] ?? t?.fuelType}
                  </button>
                );
              })}
            </div>

            {/* Validation error banner */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
                ⚠️ {validationError}
              </div>
            )}

            {/* Active tank form */}
            {fields[activeTankIdx] && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  {FUEL_LABELS[watchedTanks[activeTankIdx]?.fuelType]} readings
                </h3>

                {/* Meter readings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Opening Meter (L)</label>
                    <input
                      {...register(`tanks.${activeTankIdx}.openingMeterReading`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Closing Meter (L)</label>
                    <input
                      {...register(`tanks.${activeTankIdx}.closingMeterReading`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Physical stock levels */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Opening Stock (L) <span className="text-blue-500">· dip reading</span>
                    </label>
                    <input
                      {...register(`tanks.${activeTankIdx}.openingStockLitres`, { valueAsNumber: true })}
                      type="number" step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Pre-filled from previous shift</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Closing Stock (L) <span className="text-blue-500">· dip reading</span></label>
                    <input
                      {...register(`tanks.${activeTankIdx}.closingStockLitres`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="Enter dip reading"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Fuel price + sales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price/L (LKR)</label>
                    <input
                      {...register(`tanks.${activeTankIdx}.pricePerLitreLkr`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="e.g. 340.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cash Sales (LKR)</label>
                    <input
                      {...register(`tanks.${activeTankIdx}.cashSalesLkr`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Credit Sales (LKR)</label>
                    <input
                      {...register(`tanks.${activeTankIdx}.creditSalesLkr`, { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Live variance preview */}
                <div className="bg-white rounded-lg border p-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Dispensed (meter)</div>
                    <div className="font-bold text-gray-900">{dispensed.toFixed(1)}L</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Dispensed (dip)</div>
                    <div className="font-bold text-gray-900">{physicalDispensed.toFixed(1)}L</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Variance</div>
                    <div className={cn(
                      'font-bold',
                      Math.abs(variance) > 200 ? 'text-red-600' : Math.abs(variance) > 50 ? 'text-yellow-600' : 'text-emerald-600',
                    )}>
                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}L
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                  <textarea
                    {...register(`tanks.${activeTankIdx}.workerNotes`)}
                    rows={2} placeholder="Any anomalies, incidents, or observations..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Navigation between tanks */}
                <div className="flex gap-2">
                  {activeTankIdx > 0 && (
                    <button type="button" onClick={() => setActiveTankIdx(activeTankIdx - 1)}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                      ← Previous Tank
                    </button>
                  )}
                  {activeTankIdx < fields.length - 1 ? (
                    <button type="button" onClick={() => setActiveTankIdx(activeTankIdx + 1)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                      Next Tank →
                    </button>
                  ) : (
                    <button type="submit"
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700">
                      Review & Submit →
                    </button>
                  )}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setStep('details')}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
              ← Back to shift details
            </button>
          </div>
        )}

        {/* ── Step 3: Review & Submit ────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Review & Submit</h2>
              <span className="text-sm text-gray-500">{watchedShift} · {watchedDate}</span>
            </div>

            <div className="space-y-3">
              {watchedTanks.map((t, idx) => {
                const disp = Math.max(0, t.closingMeterReading - t.openingMeterReading);
                const physDisp = Math.max(0, t.openingStockLitres - t.closingStockLitres);
                const vari = disp - physDisp;
                const totalSales = (t.cashSalesLkr ?? 0) + (t.creditSalesLkr ?? 0);
                return (
                  <div key={idx} className="bg-gray-50 rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {FUEL_LABELS[t.fuelType] ?? t.fuelType}
                      </span>
                      <span className={cn(
                        'text-xs font-semibold',
                        Math.abs(vari) > 200 ? 'text-red-600' : Math.abs(vari) > 50 ? 'text-yellow-600' : 'text-emerald-600',
                      )}>
                        Variance: {vari > 0 ? '+' : ''}{vari.toFixed(1)}L
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                      <div className="flex justify-between"><span>Meter reading</span><span className="font-medium">{t.openingMeterReading} → {t.closingMeterReading}</span></div>
                      <div className="flex justify-between"><span>Dispensed (meter)</span><span className="font-medium">{disp.toFixed(1)}L</span></div>
                      <div className="flex justify-between"><span>Stock (dip)</span><span className="font-medium">{t.openingStockLitres} → {t.closingStockLitres}</span></div>
                      <div className="flex justify-between"><span>Price/L</span><span className="font-medium">LKR {t.pricePerLitreLkr}</span></div>
                      <div className="flex justify-between"><span>Cash sales</span><span className="font-medium">LKR {t.cashSalesLkr?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Total sales</span><span className="font-medium text-blue-700">LKR {totalSales.toLocaleString()}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('tanks')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                ← Edit Readings
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(watch())}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-bold"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Shift Log ✓'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
