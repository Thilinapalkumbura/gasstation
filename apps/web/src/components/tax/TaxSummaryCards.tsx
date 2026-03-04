'use client';

import { TaxSummary } from '@/lib/api/tax.api';

interface Props {
  data: TaxSummary;
}

function lkr(v: number) {
  return `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CardProps {
  label: string;
  sublabel: string;
  total: number;
  paid: number;
  unpaid: number;
  accentClass: string;
}

function TaxCard({ label, sublabel, total, paid, unpaid, accentClass }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border-2 ${accentClass} shadow-sm p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            unpaid > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {unpaid > 0 ? 'Due' : 'Paid'}
        </span>
      </div>
      <div className="mt-3">
        <div className="text-xl font-bold text-gray-900">{lkr(unpaid)}</div>
        <div className="text-xs text-gray-500 mt-0.5">Outstanding</div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-400">Total</div>
          <div className="font-medium text-gray-700">{lkr(total)}</div>
        </div>
        <div>
          <div className="text-gray-400">Paid</div>
          <div className="font-medium text-green-700">{lkr(paid)}</div>
        </div>
      </div>
    </div>
  );
}

export function TaxSummaryCards({ data }: Props) {
  const s = data.summary;

  const vat = s['VAT'] ?? { total: 0, paid: 0, unpaid: 0 };
  const wht = s['WHT'] ?? { total: 0, paid: 0, unpaid: 0 };
  const incomeTax = s['INCOME_TAX'] ?? { total: 0, paid: 0, unpaid: 0 };
  const totalUnpaid = Object.values(s).reduce((sum, e) => sum + e.unpaid, 0);
  const totalPaid = Object.values(s).reduce((sum, e) => sum + e.paid, 0);
  const totalAll = Object.values(s).reduce((sum, e) => sum + e.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Tax Summary — {data.year}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TaxCard
          label="VAT"
          sublabel="Value Added Tax (18%)"
          {...vat}
          accentClass="border-blue-200"
        />
        <TaxCard
          label="WHT"
          sublabel="Withholding Tax (5%)"
          {...wht}
          accentClass="border-amber-200"
        />
        <TaxCard
          label="Income Tax"
          sublabel="Corporate Tax Est. (30%)"
          {...incomeTax}
          accentClass="border-purple-200"
        />

        {/* Total liability card */}
        <div className="bg-gray-900 rounded-xl border-2 border-gray-700 shadow-sm p-5 text-white">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Total Tax Liability
          </div>
          <div className="text-xs text-gray-500 mt-0.5">All types combined</div>
          <div className="mt-3">
            <div className="text-xl font-bold text-red-400">{lkr(totalUnpaid)}</div>
            <div className="text-xs text-gray-400 mt-0.5">Outstanding</div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Total</div>
              <div className="font-medium text-gray-200">{lkr(totalAll)}</div>
            </div>
            <div>
              <div className="text-gray-500">Paid</div>
              <div className="font-medium text-green-400">{lkr(totalPaid)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
