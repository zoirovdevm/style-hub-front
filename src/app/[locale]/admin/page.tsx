'use client';

import { useQuery } from '@apollo/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Wifi, ShoppingBag, ClipboardList, Clock, Truck, XCircle, Wallet } from 'lucide-react';
import { GET_ADMIN_STATS } from '@/lib/graphql/queries';
import { usePresence } from '@/lib/hooks/use-presence';
import { StatCard } from '@/components/admin/StatCard';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

export default function AdminDashboardPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;

  const { data, loading } = useQuery(GET_ADMIN_STATS, { pollInterval: 20000 });
  const liveOnline = usePresence();
  const stats = data?.adminStats;

  const orderStatusData = stats
    ? [
        { name: dict.admin.pendingOrders, value: stats.pendingOrders },
        { name: dict.admin.processingOrders, value: stats.processingOrders },
        { name: dict.orders.statusShipped, value: stats.shippedOrders },
        { name: dict.admin.deliveredOrders, value: stats.deliveredOrders },
        { name: dict.admin.cancelledOrders, value: stats.cancelledOrders },
      ]
    : [];

  const revenueBarData = stats
    ? [
        { name: dict.admin.revenueToday, value: stats.revenueToday },
        { name: dict.admin.revenueTotal, value: stats.revenueTotal },
      ]
    : [];

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="section-title">{dict.admin.dashboard}</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={dict.admin.totalUsers} value={stats.totalUsers} icon={Users} accent="#111114" />
        <StatCard
          label={dict.admin.onlineUsers}
          value={liveOnline ?? stats.onlineUsers}
          icon={Wifi}
          accent="#10b981"
          live
        />
        <StatCard label={dict.admin.totalProducts} value={stats.totalProducts} icon={ShoppingBag} accent="#3b82f6" />
        <StatCard label={dict.admin.totalOrders} value={stats.totalOrders} icon={ClipboardList} accent="#8b5cf6" />
        <StatCard label={dict.admin.pendingOrders} value={stats.pendingOrders} icon={Clock} accent="#f59e0b" />
        <StatCard label={dict.admin.processingOrders} value={stats.processingOrders} icon={Truck} accent="#3b82f6" />
        <StatCard label={dict.admin.cancelledOrders} value={stats.cancelledOrders} icon={XCircle} accent="#ef4444" />
        <StatCard label={dict.admin.revenueToday} value={formatPrice(stats.revenueToday, locale)} icon={Wallet} accent="#c9a24f" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">{dict.admin.orders}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={orderStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {orderStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">{dict.admin.revenueTotal}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueBarData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => formatPrice(v, locale)} />
              <Bar dataKey="value" fill="#c9a24f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">{dict.admin.recentOrders}</h2>
          <div className="space-y-3">
            {stats.recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between border-b border-ink-900/5 pb-3 text-sm last:border-0">
                <div>
                  <p className="font-mono font-semibold">{order.orderNumber}</p>
                  <p className="text-xs text-ink-900/40">{formatDate(order.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatPrice(order.totalAmount, locale)}</span>
                  <OrderStatusBadge status={order.status} dict={dict} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">{dict.admin.lowStock}</h2>
          <div className="space-y-3">
            {stats.lowStockProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="max-w-[70%] truncate">{p.title}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{p.stock}</span>
              </div>
            ))}
            {stats.lowStockProducts.length === 0 && <p className="text-xs text-ink-900/40">—</p>}
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">{dict.admin.bestSellers}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.bestSellers.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-ink-900/5 p-3 text-sm">
              <p className="truncate font-semibold">{p.title}</p>
              <p className="text-xs text-ink-900/40">
                {p.soldCount} {dict.admin.unitsSold}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
