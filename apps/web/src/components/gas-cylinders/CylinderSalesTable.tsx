'use client';

import { CylinderSale } from '@/lib/api/gas-cylinders.api';

interface Props {
  sales: CylinderSale[];
  loading?: boolean;
}

export function CylinderSalesTable({ sales, loading }: Props) {
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  if (!sales.length) return <div className="text-center py-8 text-gray-400 text-sm">No cylinder sales found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">Date</th>
            <th className="px-3 py-2 font-medium text-gray-600">Cylinder</th>
            <th className="px-3 py-2 font-medium text-gray-600">Type</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Amount</th>
            <th className="px-3 py-2 font-medium text-gray-600">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">{sale.saleDate?.slice(0, 10)}</td>
              <td className="px-3 py-2 font-medium">{sale.gasCylinder?.brand} {Number(sale.gasCylinder?.sizeKg)}kg</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${sale.isExchange ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {sale.isExchange ? 'Exchange' : 'New'}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{sale.quantity}</td>
              <td className="px-3 py-2 text-right font-medium">Rs. {Number(sale.amountLkr).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-gray-500 capitalize">{sale.paymentMethod?.toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
