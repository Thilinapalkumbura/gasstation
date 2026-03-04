'use client';

import { VATReturn } from '@/lib/api/tax.api';

interface Props {
  data: VATReturn;
}

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface BoxRowProps {
  box: string;
  label: string;
  value: number;
  note?: string;
  highlight?: boolean;
  isRefund?: boolean;
}

function BoxRow({ box, label, value, note, highlight, isRefund }: BoxRowProps) {
  return (
    <tr className={highlight ? (isRefund ? 'bg-green-50' : 'bg-amber-50') : 'hover:bg-gray-50'}>
      <td className="px-4 py-3 text-xs font-bold text-gray-500 w-16">{box}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {label}
        {note && <div className="text-xs text-gray-400">{note}</div>}
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-mono font-semibold ${
          highlight ? (isRefund ? 'text-green-700' : 'text-amber-700') : 'text-gray-900'
        }`}
      >
        {lkr(value)}
      </td>
    </tr>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr className="bg-gray-800 text-white">
      <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wide">
        {title}
      </td>
    </tr>
  );
}

export function VATReturnView({ data }: Props) {
  const { partA, partB, partC, period } = data;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gray-900 text-white">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Inland Revenue Department — Sri Lanka
        </div>
        <h2 className="text-lg font-bold mt-0.5">VAT Return — Form VAT-01</h2>
        <div className="text-sm text-gray-300 mt-1">
          Tax Period: {MONTH_NAMES[period.month]} {period.year}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Box</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Part A — Output Tax */}
            <SectionHeader title="Part A — Output Tax (Sales)" />
            <BoxRow
              box="Box 1"
              label="Total value of taxable supplies (incl. VAT)"
              value={partA.box1_grossSalesIncVat}
              note="Sum of all fuel sales including VAT"
            />
            <BoxRow
              box="Box 2"
              label="Output VAT (Box 1 × 18/118)"
              value={partA.box2_outputVat}
              note="VAT collected on standard-rated supplies"
            />
            <BoxRow
              box="Box 3"
              label="Zero-rated supplies"
              value={partA.box3_zeroRatedSupplies}
              note="Exported goods / zero-rated fuel"
            />
            <BoxRow
              box="Box 4"
              label="Standard-rated sales (ex-VAT)"
              value={partA.box4_standardRatedSalesExVat}
              note="Box 1 minus Box 2"
            />

            {/* Part B — Input Tax */}
            <SectionHeader title="Part B — Input Tax (Purchases)" />
            <BoxRow
              box="Box 5"
              label="Total purchases from VAT-registered suppliers (incl. VAT)"
              value={partB.box5_totalPurchasesIncVat}
              note="GRN amounts from VAT-registered suppliers only"
            />
            <BoxRow
              box="Box 6"
              label="Input VAT (Box 5 × 18/118)"
              value={partB.box6_inputVat}
              note="VAT paid on qualifying purchases"
            />

            {/* Part C — Net */}
            <SectionHeader title="Part C — Net VAT Payable / Refundable" />
            <BoxRow
              box="Box 7"
              label={partC.isRefund ? 'VAT Refund Due (Box 2 − Box 6)' : 'Net VAT Payable to IRD (Box 2 − Box 6)'}
              value={Math.abs(partC.box7_netVatPayable)}
              note={partC.isRefund ? 'Refund claim — input tax exceeds output tax' : 'Amount payable to Inland Revenue by the 20th of next month'}
              highlight
              isRefund={partC.isRefund}
            />
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={`px-6 py-4 border-t ${partC.isRefund ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {partC.isRefund ? 'Refund Due' : 'Net VAT Payable'}
            </div>
            <div className={`text-xl font-bold ${partC.isRefund ? 'text-green-700' : 'text-amber-700'}`}>
              {lkr(Math.abs(partC.box7_netVatPayable))}
            </div>
            {!partC.isRefund && (
              <div className="text-xs text-gray-500 mt-0.5">
                Due by 20th of {MONTH_NAMES[period.month === 12 ? 1 : period.month + 1]}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`text-3xl ${partC.isRefund ? 'text-green-500' : 'text-amber-500'}`}>
              {partC.isRefund ? '↩' : '⚠'}
            </div>
            <div className="text-xs text-gray-500">
              {partC.isRefund ? 'Credit available' : 'Payment required'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-2 bg-gray-50 border-t text-xs text-gray-400">
        This VAT return is computed per IRD VAT-01 format. VAT rate: 18% per Economic Service Charges Act amendment effective 2024. File with IRD by the 20th of the month following the tax period.
      </div>
    </div>
  );
}
