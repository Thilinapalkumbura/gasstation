import { cn } from '@/lib/utils';

interface Props {
  varianceLitres: number;
  severity: 'ok' | 'warning' | 'critical';
  showLabel?: boolean;
}

export function VarianceBadge({ varianceLitres, severity, showLabel = true }: Props) {
  const abs = Math.abs(varianceLitres);
  const sign = varianceLitres > 0 ? '+' : varianceLitres < 0 ? '−' : '';

  const styles = {
    ok: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
  };

  const icons = { ok: '✓', warning: '⚠', critical: '🚨' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        styles[severity],
      )}
      title={
        severity === 'ok'
          ? 'Variance within acceptable range'
          : severity === 'warning'
          ? 'Variance exceeds 50L — review required'
          : 'Critical variance >200L — investigate before approving'
      }
    >
      <span>{icons[severity]}</span>
      {showLabel && (
        <span>
          {sign}{abs.toFixed(1)}L
        </span>
      )}
    </span>
  );
}
