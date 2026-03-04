'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UsageLog, usageApi } from '@/lib/api/usage.api';
import { VarianceBadge } from './VarianceBadge';
import { cn } from '@/lib/utils';

interface Props {
  log: UsageLog;
}

const SHIFT_ICONS: Record<string, string> = {
  MORNING: '🌅', EVENING: '🌆', NIGHT: '🌙',
};

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

export function PendingApprovalCard({ log }: Props) {
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [forceApprove, setForceApprove] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-logs'] });
    queryClient.invalidateQueries({ queryKey: ['usage-logs'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => usageApi.approveLog(log.id),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () => usageApi.rejectLog(log.id, rejectionNotes),
    onSuccess: () => { invalidate(); setShowRejectForm(false); },
  });

  const lkr = (v: number) =>
    v.toLocaleString('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
      log.isVarianceHigh && 'border-yellow-300',
      log.varianceSeverity === 'critical' && 'border-red-300 ring-1 ring-red-200',
    )}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{SHIFT_ICONS[log.shiftType]}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {FUEL_LABELS[log.tank.fuelType] ?? log.tank.fuelType}
              </span>
              <span className="text-xs text-gray-500">
                {log.shiftType} · {new Date(log.date).toLocaleDateString('en-LK')}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {log.tank.station.name} · by {log.recordedBy.fullName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VarianceBadge
            varianceLitres={log.varianceLitres}
            severity={log.varianceSeverity}
          />
          <button onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 text-sm">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-4 pb-3 grid grid-cols-4 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500">Dispensed</div>
          <div className="text-sm font-bold text-gray-900">{log.dispensedLitres.toFixed(0)}L</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500">Dip-based</div>
          <div className="text-sm font-bold text-gray-900">{log.physicalDispensedLitres.toFixed(0)}L</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500">Cash Sales</div>
          <div className="text-sm font-bold text-gray-900">{lkr(log.cashSalesLkr)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-xs text-gray-500">Total Sales</div>
          <div className="text-sm font-bold text-blue-700">{lkr(log.totalSalesLkr)}</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t pt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600">
          <div className="flex justify-between"><span>Opening meter</span><span className="font-mono font-medium">{log.openingMeterReading.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Closing meter</span><span className="font-mono font-medium">{log.closingMeterReading.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Opening stock</span><span className="font-medium">{log.openingStockLitres.toFixed(0)}L</span></div>
          <div className="flex justify-between"><span>Closing stock</span><span className="font-medium">{log.closingStockLitres.toFixed(0)}L</span></div>
          <div className="flex justify-between"><span>Price/litre</span><span className="font-medium">LKR {log.pricePerLitreLkr.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Credit sales</span><span className="font-medium">{lkr(log.creditSalesLkr)}</span></div>
          {log.workerNotes && (
            <div className="col-span-2 bg-yellow-50 rounded px-2 py-1 text-yellow-800">
              <span className="font-semibold">Worker note: </span>{log.workerNotes}
            </div>
          )}
          {log.varianceSeverity === 'critical' && (
            <div className="col-span-2 bg-red-50 border border-red-200 rounded px-2 py-1.5 text-red-700 text-xs">
              🚨 <strong>Critical variance ({log.varianceLitres.toFixed(1)}L)</strong> — investigate before approving. Possible causes: meter malfunction, leak, measurement error.
            </div>
          )}
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div className="px-4 pb-3 border-t pt-3 space-y-2">
          <label className="block text-xs font-medium text-gray-700">Rejection reason (shown to worker)</label>
          <textarea
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Meter readings seem incorrect — opening should be higher"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectForm(false)}
              className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionNotes.trim() || rejectMutation.isPending}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-xs font-semibold"
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showRejectForm && (
        <div className="px-4 pb-4 border-t pt-3 space-y-2">
          {log.varianceSeverity === 'critical' && !forceApprove && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start justify-between gap-2">
              <span>🚨 Critical variance — Approve is blocked. Verify readings before approving.</span>
              <button
                onClick={() => setForceApprove(true)}
                className="shrink-0 underline underline-offset-2 text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
              >
                Override
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50"
            >
              Reject
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || (log.varianceSeverity === 'critical' && !forceApprove)}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-semibold"
            >
              {approveMutation.isPending ? 'Approving…' : '✓ Approve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
