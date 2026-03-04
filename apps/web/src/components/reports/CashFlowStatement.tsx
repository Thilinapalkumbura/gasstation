'use client';

import { CashFlowStatement as CFS } from '@/lib/api/reports.api';

interface Props {
  data: CFS;
}

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Row({
  label,
  value,
  indent = 0,
  bold = false,
  negative = false,
}: {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  negative?: boolean;
}) {
  const display = negative ? `(${lkr(Math.abs(value))})` : lkr(value);
  return (
    <tr>
      <td
        className={`py-2 pr-4 text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
        style={{ paddingLeft: `${(indent + 1) * 16}px` }}
      >
        {label}
      </td>
      <td
        className={`py-2 text-right font-mono text-sm ${
          bold ? 'font-semibold text-gray-900' : negative ? 'text-red-600' : 'text-gray-700'
        }`}
      >
        {display}
      </td>
    </tr>
  );
}

function Divider() {
  return (
    <tr>
      <td colSpan={2}>
        <hr className="border-gray-200" />
      </td>
    </tr>
  );
}

export function CashFlowStatement({ data }: Props) {
  const isPositive = data.netOperatingCashFlow >= 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-900 text-white">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          LKAS 7 — Statement of Cash Flows (Direct Method)
        </div>
        <h2 className="text-lg font-bold mt-0.5">Cash Flow Statement</h2>
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
            {/* Cash Receipts */}
            <Row label="CASH RECEIPTS FROM OPERATING ACTIVITIES" value={0} bold />
            <Row
              label="Cash received from fuel sales"
              value={data.cashReceipts.cashSales}
              indent={1}
            />
            <Row
              label="Total Cash Receipts"
              value={data.cashReceipts.total}
              indent={1}
              bold
            />

            <Divider />

            {/* Cash Payments */}
            <Row label="CASH PAYMENTS FOR OPERATING ACTIVITIES" value={0} bold />
            <Row
              label="Payments for fuel purchases (GRN)"
              value={data.cashPayments.fuelPurchases}
              indent={1}
              negative
            />
            <Row
              label="Salaries & wages paid"
              value={data.cashPayments.salaries}
              indent={1}
              negative
            />
            <Row
              label="Operating expenses paid"
              value={data.cashPayments.operatingExpenses}
              indent={1}
              negative
            />
            <Row
              label="Tax payments"
              value={data.cashPayments.taxPayments}
              indent={1}
              negative
            />
            <Row
              label="Total Cash Payments"
              value={data.cashPayments.total}
              indent={1}
              bold
              negative
            />

            <Divider />

            {/* Net */}
            <tr className={isPositive ? 'bg-green-50' : 'bg-red-50'}>
              <td className="py-3 pl-4 text-sm font-bold text-gray-900">
                Net Cash from Operating Activities
              </td>
              <td
                className={`py-3 text-right font-mono text-sm font-bold ${
                  isPositive ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {isPositive
                  ? lkr(data.netOperatingCashFlow)
                  : `(${lkr(Math.abs(data.netOperatingCashFlow))})`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-400">
        Prepared in accordance with LKAS 7 — Statement of Cash Flows, using the direct method. Cash receipts from credit sales excluded; only cash transactions included.
      </div>
    </div>
  );
}
