'use client';

import { SparePart } from '@/lib/api/spare-parts.api';

interface Props {
  parts: SparePart[];
  loading?: boolean;
  onStockIn?: (part: SparePart) => void;
}

export function SparePartCatalogTable({ parts, loading, onStockIn }: Props) {
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  if (!parts.length) return <div className="text-center py-8 text-gray-400 text-sm">No parts in catalog.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">SKU</th>
            <th className="px-3 py-2 font-medium text-gray-600">Name</th>
            <th className="px-3 py-2 font-medium text-gray-600">Brand</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Unit Price</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Stock</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Reorder</th>
            {onStockIn && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {parts.map((part) => {
            const isLow = part.currentStock <= part.reorderLevel;
            return (
              <tr key={part.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50' : ''}`}>
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{part.sku}</td>
                <td className="px-3 py-2 font-medium">{part.name}</td>
                <td className="px-3 py-2 text-gray-500">{part.brand ?? '-'}</td>
                <td className="px-3 py-2 text-right">Rs. {Number(part.unitPriceLkr).toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-medium ${isLow ? 'text-amber-600' : 'text-green-700'}`}>
                  {part.currentStock}
                </td>
                <td className="px-3 py-2 text-right text-gray-400">{part.reorderLevel}</td>
                {onStockIn && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onStockIn(part)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Stock In
                    </button>
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
