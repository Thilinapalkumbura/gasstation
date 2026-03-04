'use client';

import { useQuery } from '@tanstack/react-query';
import { usageApi, DailySummaryEntry } from '@/lib/api/usage.api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface Props {
  stationId: string;
  days?: number;
}

const FUEL_COLORS: Record<string, string> = {
  PETROL_92: '#22c55e',
  PETROL_95: '#3b82f6',
  AUTO_DIESEL: '#f59e0b',
  SUPER_DIESEL: '#f97316',
  KEROSENE: '#8b5cf6',
};

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92', PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel', SUPER_DIESEL: 'Super Diesel', KEROSENE: 'Kerosene',
};

function formatDateLabel(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM');
}

function lkr(v: number) {
  return `LKR ${(v / 1000).toFixed(0)}k`;
}

export function DailySummaryChart({ stationId, days = 14 }: Props) {
  const to = new Date().toISOString().slice(0, 10);
  const from = subDays(new Date(), days).toISOString().slice(0, 10);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['daily-summary', stationId, from, to],
    queryFn: () => usageApi.getDailySummary(stationId, from, to),
    enabled: !!stationId,
  });

  if (isLoading) {
    return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!summary?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl">
        No approved usage data for the last {days} days.
      </div>
    );
  }

  // Flatten for charts: each row = one day with a column per fuel type
  const allFuels = Array.from(
    new Set(summary.flatMap((d) => Object.keys(d.fuels)))
  );

  const dispensedData = summary.map((d) => ({
    date: formatDateLabel(d.date),
    ...Object.fromEntries(allFuels.map((f) => [f, Math.round(d.fuels[f]?.dispensedLitres ?? 0)])),
    total: Math.round(d.dayTotalLitres),
  }));

  const salesData = summary.map((d) => ({
    date: formatDateLabel(d.date),
    totalSalesLkr: Math.round(d.dayTotalSalesLkr),
    cashSalesLkr: Math.round(Object.values(d.fuels).reduce((s, f) => s + f.cashSalesLkr, 0)),
    creditSalesLkr: Math.round(Object.values(d.fuels).reduce((s, f) => s + f.creditSalesLkr, 0)),
  }));

  return (
    <div className="space-y-6">
      {/* Dispensed by fuel type */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Daily Dispensed Volume (litres) — last {days} days
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dispensedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
            <Tooltip formatter={(v: any, name: string) => [`${v}L`, FUEL_LABELS[name] ?? name]} />
            <Legend formatter={(name) => FUEL_LABELS[name] ?? name} />
            {allFuels.map((f) => (
              <Bar key={f} dataKey={f} fill={FUEL_COLORS[f] ?? '#94a3b8'} stackId="a" radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales trend */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Sales (LKR)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={salesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={lkr} />
            <Tooltip formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, '']} />
            <Legend />
            <Line type="monotone" dataKey="totalSalesLkr" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total Sales" />
            <Line type="monotone" dataKey="cashSalesLkr" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Cash" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="creditSalesLkr" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Credit" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
