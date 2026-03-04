'use client';

import { cn } from '@/lib/utils';

interface TankGaugeProps {
  fuelType: string;
  capacityLitres: number;
  currentLevelLitres: number;
  reorderLevelLitres: number;
  percentageFull: number;
  isLow: boolean;
  isCritical: boolean;
  lastUpdated: string;
  className?: string;
  compact?: boolean;
}

const FUEL_LABELS: Record<string, string> = {
  PETROL_92: 'Petrol 92',
  PETROL_95: 'Petrol 95',
  AUTO_DIESEL: 'Auto Diesel',
  SUPER_DIESEL: 'Super Diesel',
  KEROSENE: 'Kerosene',
};

const FUEL_COLORS: Record<string, { bar: string; bg: string; text: string; badge: string }> = {
  PETROL_92:   { bar: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  PETROL_95:   { bar: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-800' },
  AUTO_DIESEL: { bar: 'bg-amber-500',   bg: 'bg-amber-50',    text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-800' },
  SUPER_DIESEL:{ bar: 'bg-orange-500',  bg: 'bg-orange-50',   text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-800' },
  KEROSENE:    { bar: 'bg-purple-500',  bg: 'bg-purple-50',   text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-800' },
};

function formatLitres(l: number): string {
  return l >= 1000 ? `${(l / 1000).toFixed(1)}kL` : `${l.toLocaleString()}L`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

export function TankGauge({
  fuelType,
  capacityLitres,
  currentLevelLitres,
  reorderLevelLitres,
  percentageFull,
  isLow,
  isCritical,
  lastUpdated,
  className,
  compact = false,
}: TankGaugeProps) {
  const colors = FUEL_COLORS[fuelType] ?? FUEL_COLORS['PETROL_92'];
  const reorderPercent = (reorderLevelLitres / capacityLitres) * 100;

  // Gauge bar color overrides for low/critical states
  const barColor = isCritical
    ? 'bg-red-500'
    : isLow
    ? 'bg-yellow-400'
    : colors.bar;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', colors.badge)}>
          {percentageFull}%
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-gray-900 truncate">
              {FUEL_LABELS[fuelType] ?? fuelType}
            </span>
            <span className="text-xs text-gray-500 ml-2">{formatLitres(currentLevelLitres)}</span>
          </div>
          <div className="mt-1 relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', barColor)}
              style={{ width: `${Math.min(percentageFull, 100)}%` }}
            />
          </div>
        </div>
        {(isLow || isCritical) && (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
            isCritical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
            {isCritical ? 'CRITICAL' : 'LOW'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm p-4 transition-shadow hover:shadow-md',
        isCritical && 'border-red-300 ring-1 ring-red-200',
        isLow && !isCritical && 'border-yellow-300 ring-1 ring-yellow-200',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', colors.badge)}>
            {FUEL_LABELS[fuelType] ?? fuelType}
          </span>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-900')}>
            {percentageFull}%
          </div>
          {(isLow || isCritical) && (
            <span className={cn('text-xs font-bold uppercase',
              isCritical ? 'text-red-600' : 'text-yellow-600')}>
              {isCritical ? '⚠ Critical' : '⚠ Low Stock'}
            </span>
          )}
        </div>
      </div>

      {/* Tank gauge — vertical bar representation */}
      <div className="relative h-36 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-3">
        {/* Reorder level marker */}
        <div
          className="absolute w-full border-t-2 border-dashed border-orange-400 z-10"
          style={{ bottom: `${reorderPercent}%` }}
        >
          <span className="absolute right-1 -top-4 text-xs text-orange-500 font-medium">
            Reorder
          </span>
        </div>

        {/* Fuel level fill */}
        <div
          className={cn(
            'absolute bottom-0 w-full rounded-b-lg transition-all duration-700 ease-out',
            barColor,
          )}
          style={{ height: `${Math.min(percentageFull, 100)}%` }}
        >
          {/* Wave shimmer */}
          <div className="absolute top-0 left-0 right-0 h-2 opacity-30 bg-white rounded-full" />
        </div>

        {/* Current level label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
            <div className="text-lg font-bold text-gray-900">{formatLitres(currentLevelLitres)}</div>
            <div className="text-xs text-gray-500">of {formatLitres(capacityLitres)}</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Available</div>
          <div className="font-semibold text-gray-900">{formatLitres(capacityLitres - currentLevelLitres)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Reorder at</div>
          <div className="font-semibold text-gray-900">{formatLitres(reorderLevelLitres)}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 text-xs text-gray-400 text-right">
        Updated {formatTime(lastUpdated)}
      </div>
    </div>
  );
}
