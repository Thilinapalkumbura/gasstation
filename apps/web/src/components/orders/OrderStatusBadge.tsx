import { cn } from '@/lib/utils';

interface Props { status: string; }

const CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:               { label: 'Draft',               cls: 'bg-gray-100 text-gray-700' },
  SUBMITTED:           { label: 'Pending Approval',    cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED:            { label: 'Approved',            cls: 'bg-blue-100 text-blue-800' },
  PARTIALLY_DELIVERED: { label: 'Part. Delivered',     cls: 'bg-orange-100 text-orange-800' },
  DELIVERED:           { label: 'Delivered',           cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED:           { label: 'Cancelled',           cls: 'bg-red-100 text-red-700' },
};

export function OrderStatusBadge({ status }: Props) {
  const { label, cls } = CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', cls)}>
      {label}
    </span>
  );
}
