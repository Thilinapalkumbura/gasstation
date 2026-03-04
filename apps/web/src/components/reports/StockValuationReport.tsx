'use client';

import { StockValuation, TankValuation } from '@/lib/api/reports.api';

interface Props {
  data: StockValuation;
}

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92',
  PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel',
  SUPER_DIESEL: 'Super Diesel',
  KEROSENE: 'Kerosene',
};

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function litres(v: number) {
  return `${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

// Group valuations by station
function groupByStation(valuations: TankValuation[]): Map<string, { name: string; items: TankValuation[] }> {
  const map = new Map<string, { name: string; items: TankValuation[] }>();
  for (const v of valuations) {
    if (!map.has(v.stationId)) {
      map.set(v.stationId, { name: v.stationName, items: [] });
    }
    map.get(v.stationId)!.items.push(v);
  }
  return map;
}

export function StockValuationReport({ data }: Props) {
  const grouped = groupByStation(data.valuations);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-900 text-white">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          LKAS 2 — Inventories (Weighted Average Cost)
        </div>
        <h2 className="text-lg font-bold mt-0.5">Stock Valuation Report</h2>
        <div className="text-sm text-gray-300 mt-0.5">As at {data.asOf}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Station
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fuel Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Quantity (L)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Unit Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from(grouped.entries()).map(([stationId, { name, items }]) => {
              const stationTotal = items.reduce((s, v) => s + v.totalValueLkr, 0);
              return (
                <>
                  {items.map((v, idx) => (
                    <tr key={v.tankId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {idx === 0 ? name : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {FUEL_LABELS[v.fuelType] ?? v.fuelType}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">
                        {litres(v.quantityLitres)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">
                        {lkr(v.unitCostLkr)}/L
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-mono font-medium text-gray-900">
                        {lkr(v.totalValueLkr)}
                      </td>
                    </tr>
                  ))}
                  <tr key={`${stationId}-subtotal`} className="bg-gray-50 border-t border-gray-200">
                    <td
                      colSpan={4}
                      className="px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {name} Subtotal
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-semibold font-mono text-gray-900">
                      {lkr(stationTotal)}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-900 text-white">
              <td colSpan={4} className="px-6 py-3 text-sm font-bold uppercase tracking-wide">
                Total Inventory Value
              </td>
              <td className="px-6 py-3 text-right text-sm font-bold font-mono">
                {lkr(data.totalInventoryValueLkr)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-400">
        {data.note}
      </div>
    </div>
  );
}
