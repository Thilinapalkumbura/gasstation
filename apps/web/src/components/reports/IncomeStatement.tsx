'use client';

import { IncomeStatement as IS } from '@/lib/api/reports.api';

interface Props {
  data: IS;
}

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Row({
  label,
  value,
  indent = 0,
  bold = false,
  highlight = false,
  sub = false,
}: {
  label: string;
  value: number | string;
  indent?: number;
  bold?: boolean;
  highlight?: boolean;
  sub?: boolean;
}) {
  const num = typeof value === 'number' ? lkr(value) : value;
  return (
    <tr
      className={
        highlight
          ? 'bg-blue-50 border-t-2 border-blue-200'
          : sub
          ? 'bg-gray-50'
          : ''
      }
    >
      <td
        className={`py-2 pr-4 text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
        style={{ paddingLeft: `${(indent + 1) * 16}px` }}
      >
        {label}
      </td>
      <td
        className={`py-2 text-right text-sm font-mono ${
          bold ? 'font-semibold text-gray-900' : 'text-gray-700'
        } ${highlight ? 'text-blue-700 font-bold' : ''}`}
      >
        {num}
      </td>
    </tr>
  );
}

function Divider() {
  return (
    <tr>
      <td colSpan={2} className="py-0">
        <hr className="border-gray-200" />
      </td>
    </tr>
  );
}

export function IncomeStatement({ data }: Props) {
  const { revenue, cogs, operatingExpenses } = data;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-900 text-white">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          LKAS 1 — Statement of Comprehensive Income
        </div>
        <h2 className="text-lg font-bold mt-0.5">Income Statement</h2>
        <div className="text-sm text-gray-300 mt-0.5">
          Period: {data.period.from} → {data.period.to}
        </div>
      </div>

      <div className="px-6 py-2">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Description
              </th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Amount (LKR)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Revenue */}
            <Row label="REVENUE" value="" bold />
            <Row label="Gross Revenue (incl. VAT)" value={revenue.grossRevenue} indent={1} />
            <Row label="Less: Output VAT" value={-revenue.outputVAT} indent={1} />
            <Row label="Net Revenue" value={revenue.netRevenue} indent={1} bold />
            <Row label="  Cash Sales" value={revenue.cashSales} indent={2} sub />
            <Row label="  Credit Sales" value={revenue.creditSales} indent={2} sub />

            {/* Fuel type breakdown */}
            {revenue.byFuelType.length > 0 && (
              <>
                <Row label="  By Fuel Type" value="" indent={2} sub />
                {revenue.byFuelType.map((ft) => (
                  <Row
                    key={ft.fuelType}
                    label={`    ${ft.fuelType.replace(/_/g, ' ')}`}
                    value={ft.netRevenue}
                    indent={3}
                    sub
                  />
                ))}
              </>
            )}

            {/* New business revenues */}
            {(revenue.vehicleServiceRevenue > 0 || revenue.carWashRevenue > 0 || revenue.sparePartsRevenue > 0 || revenue.gasCylinderRevenue > 0) && (
              <>
                <Row label="  Other Business Revenue" value="" indent={2} sub />
                {revenue.vehicleServiceRevenue > 0 && <Row label="    Vehicle Services" value={revenue.vehicleServiceRevenue} indent={3} sub />}
                {revenue.carWashRevenue > 0 && <Row label="    Car Wash" value={revenue.carWashRevenue} indent={3} sub />}
                {revenue.sparePartsRevenue > 0 && <Row label="    Spare Parts" value={revenue.sparePartsRevenue} indent={3} sub />}
                {revenue.gasCylinderRevenue > 0 && <Row label="    Gas Cylinders" value={revenue.gasCylinderRevenue} indent={3} sub />}
                <Row label="  Total Gross Revenue" value={revenue.totalGrossRevenue} indent={2} bold sub />
              </>
            )}

            <Divider />

            {/* COGS */}
            <Row label="COST OF GOODS SOLD" value="" bold />
            <Row label="Fuel Purchases (GRN)" value={cogs.totalPurchases} indent={1} />
            {(cogs.sparePartsCogs ?? 0) > 0 && <Row label="Spare Parts Purchases" value={cogs.sparePartsCogs} indent={1} />}
            {(cogs.gasCylinderCogs ?? 0) > 0 && <Row label="Gas Cylinder Purchases" value={cogs.gasCylinderCogs} indent={1} />}
            {((cogs.sparePartsCogs ?? 0) > 0 || (cogs.gasCylinderCogs ?? 0) > 0) && (
              <Row label="Total Cost of Goods Sold" value={cogs.totalCogs ?? cogs.totalPurchases} indent={1} bold />
            )}

            <Divider />

            {/* Gross Profit */}
            <Row label="GROSS PROFIT" value={data.grossProfit} bold highlight />
            <Row
              label="Gross Margin"
              value={`${data.grossMarginPct.toFixed(1)}%`}
              indent={1}
              sub
            />

            <Divider />

            {/* Operating Expenses */}
            <Row label="OPERATING EXPENSES" value="" bold />
            <Row label="Salaries & Wages" value={operatingExpenses.salaries} indent={1} />
            <Row label="Operating Expenses" value={operatingExpenses.opex} indent={1} />
            <Row label="Other Expenses" value={operatingExpenses.otherExpenses} indent={1} />
            <Row label="Total Operating Expenses" value={operatingExpenses.total} indent={1} bold />

            <Divider />

            <Row label="Other Income" value={data.otherIncome} indent={1} />

            <Divider />

            {/* EBIT */}
            <Row label="EBIT (Operating Profit)" value={data.ebit} bold />

            <Divider />

            {/* Tax */}
            <Row label="Income Tax Estimate (30%)" value={data.incomeTaxEstimate} indent={1} />

            <Divider />

            {/* Net Profit */}
            <Row label="NET PROFIT" value={data.netProfit} bold highlight />
            <Row
              label="Net Margin"
              value={`${data.netMarginPct.toFixed(1)}%`}
              indent={1}
              sub
            />
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-400">
        Prepared in accordance with LKAS 1 — Presentation of Financial Statements. Tax estimate at 30% of PBT per Sri Lanka IRD guidelines.
      </div>
    </div>
  );
}
