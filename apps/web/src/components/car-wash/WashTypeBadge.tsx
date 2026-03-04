'use client';

const TYPE_STYLES: Record<string, { label: string; classes: string }> = {
  BASIC:       { label: 'Basic',       classes: 'bg-gray-100 text-gray-800' },
  STANDARD:    { label: 'Standard',    classes: 'bg-blue-100 text-blue-800' },
  PREMIUM:     { label: 'Premium',     classes: 'bg-purple-100 text-purple-800' },
  INTERIOR:    { label: 'Interior',    classes: 'bg-yellow-100 text-yellow-800' },
  FULL_DETAIL: { label: 'Full Detail', classes: 'bg-green-100 text-green-800' },
};

export function WashTypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? { label: type, classes: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.classes}`}>
      {style.label}
    </span>
  );
}
