'use client';

const TYPE_STYLES: Record<string, { label: string; classes: string }> = {
  OIL_CHANGE:      { label: 'Oil Change',      classes: 'bg-yellow-100 text-yellow-800' },
  TIRE_SERVICE:    { label: 'Tire Service',    classes: 'bg-blue-100 text-blue-800' },
  BATTERY_SERVICE: { label: 'Battery',         classes: 'bg-green-100 text-green-800' },
  BRAKE_SERVICE:   { label: 'Brakes',          classes: 'bg-red-100 text-red-800' },
  AC_SERVICE:      { label: 'A/C Service',     classes: 'bg-cyan-100 text-cyan-800' },
  ELECTRICAL:      { label: 'Electrical',      classes: 'bg-purple-100 text-purple-800' },
  GENERAL_REPAIR:  { label: 'General Repair',  classes: 'bg-orange-100 text-orange-800' },
  OTHER:           { label: 'Other',           classes: 'bg-gray-100 text-gray-800' },
};

export function ServiceTypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? { label: type, classes: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.classes}`}>
      {style.label}
    </span>
  );
}
