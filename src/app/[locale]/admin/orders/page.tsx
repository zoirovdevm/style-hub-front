'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { AlertCircle } from 'lucide-react';
import { GET_ALL_ORDERS } from '@/lib/graphql/queries';
import { UPDATE_ORDER_STATUS, SET_ORDER_PAYMENT_STATUS } from '@/lib/graphql/mutations';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

// Maps each status to the same dictionary keys OrderStatusBadge already
// uses, so the dropdown options are translated instead of showing raw
// English enum values like "PROCESSING".
const STATUS_KEYS: Record<(typeof STATUSES)[number], keyof Dictionary['orders']> = {
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  SHIPPED: 'statusShipped',
  DELIVERED: 'statusDelivered',
  CANCELLED: 'statusCancelled',
};

export default function AdminOrdersPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [rowError, setRowError] = useState<{ orderId: string; message: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_ALL_ORDERS, {
    variables: {
      filter: { page: 1, limit: 100, status: statusFilter || undefined, paymentStatus: paymentFilter || undefined },
    },
  });
  // The mutation returns { id, status }, which Apollo automatically merges
  // into its normalized cache for that Order entity — so every component
  // reading this order's status (including the buyer's own orders page, if
  // it shares the same cache) updates reactively without a manual refetch.
  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);
  // Deliberately separate from status: whether the buyer paid is confirmed
  // manually (Telegram receipt check) and shouldn't be conflated with the
  // fulfillment stage dropdown below.
  const [setPaymentStatus] = useMutation(SET_ORDER_PAYMENT_STATUS);

  const orders = data?.allOrders?.list ?? [];

  async function handleStatusChange(orderId: string, status: string) {
    setRowError(null);
    setUpdatingId(orderId);
    try {
      await updateStatus({ variables: { input: { orderId, status } } });
      await refetch();
    } catch (error) {
      setRowError({ orderId, message: getFriendlyErrorMessage(error) });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleTogglePaid(orderId: string, currentlyPaid: boolean) {
    setRowError(null);
    setUpdatingId(orderId);
    try {
      await setPaymentStatus({ variables: { orderId, paid: !currentlyPaid } });
      await refetch();
    } catch (error) {
      setRowError({ orderId, message: getFriendlyErrorMessage(error) });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">{dict.admin.orders}</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-full border border-ink-900/15 bg-white px-4 py-2 text-xs font-semibold outline-none dark:border-white/15 dark:bg-ink-800"
          >
            <option value="">{dict.admin.paymentStatus}: {dict.admin.allStatuses}</option>
            <option value="PAID">{dict.admin.paid}</option>
            <option value="PENDING">{dict.admin.unpaid}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-ink-900/15 bg-white px-4 py-2 text-xs font-semibold outline-none dark:border-white/15 dark:bg-ink-800"
          >
            <option value="">{dict.admin.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.orders[STATUS_KEYS[s]]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rowError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{rowError.message}</span>
        </div>
      )}

      <div className="card-surface overflow-x-auto p-0">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wider text-ink-900/40">
              <th className="px-5 py-4">{dict.orders.orderNumber}</th>
              <th className="px-5 py-4">{dict.admin.customer}</th>
              <th className="px-5 py-4">{dict.admin.phone}</th>
              <th className="px-5 py-4">{dict.admin.address}</th>
              <th className="px-5 py-4">{dict.admin.orderItems}</th>
              <th className="px-5 py-4">{dict.orders.date}</th>
              <th className="px-5 py-4">{dict.orders.total}</th>
              <th className="px-5 py-4">{dict.admin.paymentStatus}</th>
              <th className="px-5 py-4">{dict.orders.status}</th>
              <th className="px-5 py-4">{dict.admin.updateStatus}</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              orders.map((order: any) => (
                <tr key={order.id} className="border-b border-ink-900/5 last:border-0">
                  <td className="px-5 py-4 font-mono font-semibold">{order.orderNumber}</td>
                  <td className="px-5 py-4">
                    {order.user?.firstName} {order.user?.lastName}
                  </td>
                  <td className="px-5 py-4 text-ink-900/60">{order.phone}</td>
                  <td className="px-5 py-4 max-w-[220px] truncate text-ink-900/60" title={order.deliveryAddress}>
                    {order.deliveryAddress}
                  </td>
                  <td
                    className="px-5 py-4 max-w-[240px] text-ink-900/60"
                    title={(order.items ?? [])
                      .map((it: any) => `${it.title} (${[it.size, it.color].filter(Boolean).join(' / ')}) × ${it.quantity}`)
                      .join(', ')}
                  >
                    <div className="space-y-0.5">
                      {(order.items ?? []).map((it: any) => (
                        <div key={it.id} className="truncate text-xs">
                          {it.title}
                          {(it.size || it.color) && (
                            <span className="text-ink-900/40"> ({[it.size, it.color].filter(Boolean).join(' / ')})</span>
                          )}
                          <span className="text-ink-900/40"> × {it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-900/60">{formatDate(order.createdAt, locale)}</td>
                  <td className="px-5 py-4 font-semibold">{formatPrice(order.totalAmount, locale)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleTogglePaid(order.id, order.paymentStatus === 'PAID')}
                      disabled={updatingId === order.id}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                      title={order.paymentStatus === 'PAID' ? dict.admin.unpaid : dict.admin.paid}
                    >
                      {order.paymentStatus === 'PAID' ? dict.admin.paid : dict.admin.unpaid}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status} dict={dict} />
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs outline-none disabled:opacity-50 dark:border-white/15 dark:bg-ink-800"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {dict.orders[STATUS_KEYS[s]]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && orders.length === 0 && <p className="p-8 text-center text-sm text-ink-900/40">{dict.orders.empty}</p>}
      </div>
    </div>
  );
}
