'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useUsageStore } from '@/store/usage.store';
import { useUsageSocket } from '@/hooks/useUsageSocket';
import { usageApi } from '@/lib/api/usage.api';
import { ShiftEntryForm } from '@/components/usage/ShiftEntryForm';
import { UsageHistoryTable } from '@/components/usage/UsageHistoryTable';
import { StatusBadge } from '@/components/usage/StatusBadge';
import { VarianceBadge } from '@/components/usage/VarianceBadge';

const SHIFT_HOURS: Record<string, string> = {
  MORNING: '06:00 – 14:00', EVENING: '14:00 – 22:00', NIGHT: '22:00 – 06:00',
};
const SHIFT_ICONS: Record<string, string> = { MORNING: '🌅', EVENING: '🌆', NIGHT: '🌙' };
const SHIFTS = ['MORNING', 'EVENING', 'NIGHT'] as const;

export default function WorkerUsagePage() {
  const user = useAuthStore((s) => s.user);
  const stationId = user?.stationId ?? '';
  const [showForm, setShowForm] = useState(false);
  const { notifications, unreadCount, markAllRead } = useUsageStore();

  // Connect WebSocket for real-time notifications
  useUsageSocket(stationId);

  // My recent submissions
  const { data: myLogsData, refetch } = useQuery({
    queryKey: ['my-logs'],
    queryFn: () => usageApi.getLogs({ limit: 20 }),
  });
  const myLogs = myLogsData?.items ?? [];

  // Which shifts are done today?
  const today = new Date().toISOString().slice(0, 10);
  const todaysLogs = myLogs.filter(
    (l) => new Date(l.date).toISOString().slice(0, 10) === today,
  );
  const doneShifts = new Set(todaysLogs.map((l) => l.shiftType));

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Daily Usage Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="relative flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1.5 rounded-lg"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {unreadCount} new {unreadCount === 1 ? 'update' : 'updates'}
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Notifications */}
        {unread.length > 0 && (
          <div className="space-y-2">
            {unread.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                n.type === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span className="text-xl">{n.type === 'approved' ? '✅' : '❌'}</span>
                <div>
                  <div className="font-semibold">
                    Shift {n.type} — {n.log.tank.fuelType.replace('_', ' ')} {n.log.shiftType}
                  </div>
                  {n.type === 'rejected' && n.log.rejectionNotes && (
                    <div className="text-xs mt-0.5 opacity-80">Reason: {n.log.rejectionNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today's shift cards */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Today's Shifts
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {SHIFTS.map((shift) => {
              const log = todaysLogs.find((l) => l.shiftType === shift);
              const isDone = doneShifts.has(shift);
              return (
                <div key={shift} className={`rounded-xl border p-2 sm:p-3 text-center ${
                  isDone
                    ? log?.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200'
                    : log?.status === 'REJECTED' ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="text-2xl mb-1">{SHIFT_ICONS[shift]}</div>
                  <div className="text-xs font-semibold text-gray-700">{shift}</div>
                  <div className="text-xs text-gray-400">{SHIFT_HOURS[shift]}</div>
                  {isDone && log && (
                    <div className="mt-2">
                      <StatusBadge status={log.status} />
                      {log.status === 'REJECTED' && (
                        <p className="text-xs text-red-600 mt-1">Tap to resubmit</p>
                      )}
                    </div>
                  )}
                  {!isDone && (
                    <div className="mt-2 text-xs text-gray-400">Not submitted</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Start shift button */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base shadow-sm"
          >
            + Record Shift Usage
          </button>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">New Shift Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <ShiftEntryForm onSuccess={() => { setShowForm(false); refetch(); }} />
          </div>
        )}

        {/* Recent submission history */}
        <section className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">My Submissions</h2>
          <UsageHistoryTable compact />
        </section>
      </div>
    </div>
  );
}
