import { PurchaseOrder } from '@/lib/api/orders.api';
import { cn } from '@/lib/utils';

interface Props { order: PurchaseOrder; }

interface Step {
  label: string;
  sublabel?: string;
  done: boolean;
  active: boolean;
  date?: string | null;
}

function fmt(d: string | null | undefined) {
  if (!d) return undefined;
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderTimeline({ order }: Props) {
  const isCancelled = order.status === 'CANCELLED';

  const steps: Step[] = [
    {
      label: 'Draft Created',
      sublabel: `by ${order.createdBy.fullName}`,
      done: true,
      active: order.status === 'DRAFT',
      date: order.createdAt,
    },
    {
      label: 'Submitted for Approval',
      done: ['SUBMITTED','APPROVED','PARTIALLY_DELIVERED','DELIVERED'].includes(order.status),
      active: order.status === 'SUBMITTED',
      date: undefined,
    },
    {
      label: 'Approved',
      sublabel: order.approvedBy ? `by ${order.approvedBy.fullName}` : undefined,
      done: ['APPROVED','PARTIALLY_DELIVERED','DELIVERED'].includes(order.status),
      active: order.status === 'APPROVED',
      date: order.approvedAt,
    },
    {
      label: order.status === 'PARTIALLY_DELIVERED' ? 'Partially Delivered' : 'Delivered',
      sublabel: order.grnsCount > 0 ? `${order.grnsCount} GRN(s)` : undefined,
      done: ['PARTIALLY_DELIVERED','DELIVERED'].includes(order.status),
      active: ['PARTIALLY_DELIVERED','DELIVERED'].includes(order.status),
      date: order.deliveredAt,
    },
  ];

  return (
    <div className="relative">
      {isCancelled && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Cancelled</strong>
          {order.cancellationReason && ` — ${order.cancellationReason}`}
          {order.cancelledAt && (
            <span className="text-xs ml-2 opacity-70">{fmt(order.cancelledAt)}</span>
          )}
        </div>
      )}

      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Connector line + dot */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0',
                step.done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step.active
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400',
              )}>
                {step.done ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-0.5 flex-1 my-1', step.done ? 'bg-emerald-300' : 'bg-gray-200')} />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={cn(
                  'text-sm font-semibold',
                  step.done ? 'text-gray-900' : 'text-gray-400',
                )}>
                  {step.label}
                </span>
                {step.sublabel && (
                  <span className="text-xs text-gray-400">{step.sublabel}</span>
                )}
              </div>
              {step.date && (
                <div className="text-xs text-gray-400 mt-0.5">{fmt(step.date)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
