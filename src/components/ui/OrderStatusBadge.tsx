import type { Dictionary } from '@/i18n/get-dictionary';

const STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const KEYS: Record<string, keyof Dictionary['orders']> = {
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  SHIPPED: 'statusShipped',
  DELIVERED: 'statusDelivered',
  CANCELLED: 'statusCancelled',
};

export function OrderStatusBadge({ status, dict }: { status: string; dict: Dictionary }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STYLES[status] ?? 'bg-ink-900/10 text-ink-900'}`}>
      {dict.orders[KEYS[status]] ?? status}
    </span>
  );
}
