'use client';

import { SparePart } from '@/lib/api/spare-parts.api';

interface Props {
  parts: SparePart[];
}

export function LowStockBanner({ parts }: Props) {
  if (!parts.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <p className="text-amber-800 text-sm font-medium mb-1">Low Stock Alert — {parts.length} item(s)</p>
      <ul className="text-amber-700 text-xs space-y-0.5">
        {parts.slice(0, 5).map((p) => (
          <li key={p.id}>{p.name} ({p.sku}) — {p.currentStock} left (reorder at {p.reorderLevel})</li>
        ))}
        {parts.length > 5 && <li>...and {parts.length - 5} more</li>}
      </ul>
    </div>
  );
}
