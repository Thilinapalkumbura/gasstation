'use client';

import { GasCylinder } from '@/lib/api/gas-cylinders.api';

interface Props {
  cylinder: GasCylinder;
  onStockIn?: () => void;
}

export function StockLevelCard({ cylinder, onStockIn }: Props) {
  const isLow = cylinder.fullStock <= cylinder.reorderLevel;
  return (
    <div className={`border rounded-lg p-4 ${isLow ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-sm">{cylinder.brand} {Number(cylinder.sizeKg)}kg</p>
          <p className="text-xs text-gray-500">{cylinder.station?.name}</p>
        </div>
        {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Low Stock</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded p-2 text-center">
          <p className="text-lg font-bold text-green-600">{cylinder.fullStock}</p>
          <p className="text-xs text-gray-500">Full</p>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <p className="text-lg font-bold text-gray-500">{cylinder.emptyStock}</p>
          <p className="text-xs text-gray-500">Empty</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Reorder at: {cylinder.reorderLevel}</p>
      {onStockIn && (
        <button onClick={onStockIn} className="mt-2 w-full text-xs text-blue-600 border border-blue-200 rounded py-1 hover:bg-blue-50">
          Stock In
        </button>
      )}
    </div>
  );
}
