'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MonthlyTrend } from '@/lib/api/reports.api';

interface Props {
  data: MonthlyTrend;
}

function lkrShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `LKR ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `LKR ${(v / 1_000).toFixed(0)}K`;
  return `LKR ${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-gray-900 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-mono font-medium text-gray-900">
            LKR {p.value.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyTrendChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-900 text-white">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Financial Performance
        </div>
        <h2 className="text-lg font-bold mt-0.5">Monthly Trend — FY {data.fiscalYear}</h2>
        <div className="text-sm text-gray-300 mt-0.5">
          April {data.fiscalYear} – March {data.fiscalYear + 1}
        </div>
      </div>

      <div className="px-6 py-4">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart
            data={data.months}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={lkrShort}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Bar
              dataKey="revenue"
              name="Net Revenue"
              fill="#3b82f6"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="cogs"
              name="COGS"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              name="Net Profit"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      <div className="px-6 py-3 bg-gray-50 border-t grid grid-cols-3 gap-4 text-center">
        {(() => {
          const totalRevenue = data.months.reduce((s, m) => s + m.revenue, 0);
          const totalCogs = data.months.reduce((s, m) => s + m.cogs, 0);
          const totalProfit = data.months.reduce((s, m) => s + m.netProfit, 0);
          return (
            <>
              <div>
                <div className="text-xs text-gray-500">Total Revenue</div>
                <div className="text-sm font-semibold text-blue-700">{lkrShort(totalRevenue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total COGS</div>
                <div className="text-sm font-semibold text-amber-700">{lkrShort(totalCogs)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Net Profit</div>
                <div className={`text-sm font-semibold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {lkrShort(totalProfit)}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
