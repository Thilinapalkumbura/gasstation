'use client';

import { SparePartSale } from '@/lib/api/spare-parts.api';

interface Props {
  sales: SparePartSale[];
  loading?: boolean;
}

export function SparePartSalesTable({ sales, loading }: Props) {
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  if (!sales.length) return <div className="text-center py-8 text-gray-400 text-sm">No sales found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">Date</th>
            <th className="px-3 py-2 font-medium text-gray-600">Items</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
            <th className="px-3 py-2 font-medium text-gray-600">Payment</th>
            <th className="px-3 py-2 font-medium text-gray-600">Station</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">{sale.saleDate?.slice(0, 10)}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">
                {sale.items?.map((i) => `${i.sparePart?.name} x${i.quantity}`).join(', ')}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                Rs. {Number(sale.totalAmountLkr).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 text-gray-500 capitalize">{sale.paymentMethod?.toLowerCase()}</td>
              <td className="px-3 py-2 text-gray-500">{sale.station?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
