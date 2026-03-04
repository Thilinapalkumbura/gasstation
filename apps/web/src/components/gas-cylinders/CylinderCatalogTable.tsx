'use client';

import { GasCylinder } from '@/lib/api/gas-cylinders.api';

interface Props {
  cylinders: GasCylinder[];
  loading?: boolean;
  onStockIn?: (cylinder: GasCylinder) => void;
}

export function CylinderCatalogTable({ cylinders, loading, onStockIn }: Props) {
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  if (!cylinders.length) return <div className="text-center py-8 text-gray-400 text-sm">No cylinders configured.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">Brand</th>
            <th className="px-3 py-2 font-medium text-gray-600">Size</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Selling Price</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Full Stock</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Empty Stock</th>
            {onStockIn && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {cylinders.map((c) => {
            const isLow = c.fullStock <= c.reorderLevel;
            return (
              <tr key={c.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50' : ''}`}>
                <td className="px-3 py-2 font-medium">{c.brand}</td>
                <td className="px-3 py-2">{Number(c.sizeKg)}kg</td>
                <td className="px-3 py-2 text-right">Rs. {Number(c.sellingPriceLkr).toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-medium ${isLow ? 'text-amber-600' : 'text-green-700'}`}>{c.fullStock}</td>
                <td className="px-3 py-2 text-right text-gray-500">{c.emptyStock}</td>
                {onStockIn && (
                  <td className="px-3 py-2">
                    <button onClick={() => onStockIn(c)} className="text-xs text-blue-600 hover:underline">Stock In</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
