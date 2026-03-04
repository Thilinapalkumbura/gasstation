import { cn } from '@/lib/utils';

interface Props {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const CONFIG = {
  PENDING:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500 animate-pulse' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: Props) {
  const { label, cls, dot } = CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
