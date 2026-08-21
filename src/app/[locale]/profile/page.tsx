'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { User2, Package, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { GET_ME, GET_MY_ORDERS } from '@/lib/graphql/queries';
import { UPDATE_PROFILE } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Reveal } from '@/components/ui/Reveal';
import { useScrollLock } from '@/lib/hooks/use-scroll-lock';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

type ProfileTab = 'orders' | 'info';
type OrderFilter = 'all' | 'paid' | 'unpaid';

export default function ProfilePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  // Dashboard/sidebar navigation — which section is shown on the right.
  // Kept as in-page tab state (not separate routes) so switching sections
  // never re-triggers the full page's loading spinner.
  const [activeTab, setActiveTab] = useState<ProfileTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  // "Accountdan chiqish" no longer logs out on the first click — it opens a
  // confirmation modal, and only the modal's own "Ha, chiqish" button
  // actually calls handleLogout. Shares the same body-scroll-lock hook every
  // other modal on the site uses, so background content stays frozen while
  // it's open exactly like the buy/review modals do.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useScrollLock(showLogoutConfirm);

  // Fields start read-only — the pencil icon next to "Shaxsiy ma'lumotlar"
  // is the only way in. Clicking it again while editing cancels: any
  // unsaved changes are discarded (reset back to the last-saved values) and
  // the fields lock again, rather than leaving a half-edited form behind.
  const [isEditing, setIsEditing] = useState(false);

  function handleLogout() {
    clearSession();
    router.push(`/${locale}`);
  }

  const { data, loading: meLoading } = useQuery(GET_ME, { skip: !user });
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  // network-only + poll so a status/payment change the admin just made shows
  // up here without the buyer needing to manually reload — same behavior the
  // standalone /orders page already had.
  const { data: ordersData, loading: ordersLoading } = useQuery(GET_MY_ORDERS, {
    skip: !user || activeTab !== 'orders',
    fetchPolicy: 'network-only',
    pollInterval: 5000,
  });
  const allOrders = ordersData?.myOrders ?? [];
  const orders =
    orderFilter === 'unpaid'
      ? allOrders.filter((o: any) => o.paymentStatus !== 'PAID')
      : orderFilter === 'paid'
        ? allOrders.filter((o: any) => o.paymentStatus === 'PAID')
        : allOrders;

  const { register, handleSubmit, reset } = useForm<ProfileForm>();

  useEffect(() => {
    if (data?.me) {
      reset({
        firstName: data.me.firstName,
        lastName: data.me.lastName ?? '',
        phone: data.me.phone ?? '',
        address: data.me.address ?? '',
      });
    }
  }, [data, reset]);

  function toggleEdit() {
    if (isEditing && data?.me) {
      // Cancel — throw away anything typed and go back to view mode.
      reset({
        firstName: data.me.firstName,
        lastName: data.me.lastName ?? '',
        phone: data.me.phone ?? '',
        address: data.me.address ?? '',
      });
    }
    setIsEditing((v) => !v);
  }

  async function handleSaveProfile(values: ProfileForm) {
    await updateProfile({ variables: { input: values } });
    setIsEditing(false);
  }

  if (!user) {
    return (
      <div className="container-app flex flex-col items-center py-32 text-center">
        <User2 size={40} className="text-ink-900/20" />
        <Link href={`/${locale}/login`} className="btn-primary mt-6">
          {dict.nav.login}
        </Link>
      </div>
    );
  }

  // First load only — without this the form fields briefly render empty
  // (default `useForm` state) until the `useEffect` below resets them once
  // `data.me` arrives.
  if (meLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  const navItems: { key: ProfileTab; label: string }[] = [
    { key: 'orders', label: dict.profile.ordersTab },
    { key: 'info', label: dict.profile.infoTab },
  ];

  return (
    <div className="container-app py-12">
      {/* Name and the admin link share one row instead of two separate
          stacked blocks — keeps the header compact on mobile instead of
          leaving a near-empty full-width bar above a big headline. The
          logout button that used to sit here is gone — "Accountdan
          chiqish" (with its confirmation modal) on the Ma'lumotlarim tab is
          now the one and only place to log out. */}
      <Reveal>
        <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl dark:text-cream">
            {user.firstName} {user.lastName}
          </h1>
          {user.role === 'ADMIN' && (
            <Link href={`/${locale}/admin`} className="btn-outline flex items-center gap-2 !px-4 !py-2 text-xs">
              <ShieldCheck size={16} />
              {dict.nav.admin}
            </Link>
          )}
        </div>
      </Reveal>

      {/* Dashboard layout: sidebar nav on the left, active section's content
          on the right. On mobile the sidebar collapses into a horizontal
          scrollable tab row instead of a vertical list, so it stays usable
          without eating vertical space above the content. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        <Reveal>
          <nav className="card-surface flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`shrink-0 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    active
                      ? 'border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400'
                      : 'border-transparent text-ink-900/60 hover:bg-ink-900/5 dark:text-cream/60 dark:hover:bg-cream/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </Reveal>

        {activeTab === 'orders' ? (
          <Reveal delay={0.05}>
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {(['all', 'paid', 'unpaid'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setOrderFilter(f)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                      orderFilter === f
                        ? 'border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400'
                        : 'border-ink-900/15 text-ink-900/60 hover:border-ink-950 dark:border-cream/15 dark:text-cream/60 dark:hover:border-cream'
                    }`}
                  >
                    {f === 'all' ? dict.profile.allOrders : f === 'paid' ? dict.profile.paidOrders : dict.profile.unpaidOrders}
                  </button>
                ))}
              </div>

              {ordersLoading && !ordersData ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
                </div>
              ) : orders.length === 0 ? (
                <div className="card-surface flex flex-col items-center px-6 py-16 text-center">
                  <Package size={36} className="text-ink-900/20" />
                  <p className="mt-4 text-sm text-ink-900/50">{dict.orders.empty}</p>
                  <Link href={`/${locale}/shop`} className="btn-primary mt-6">
                    {dict.cart.continueShopping}
                  </Link>
                </div>
              ) : (
                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                  {orders.map((order: any, i: number) => {
                    const cover = order.items[0]?.product?.images?.[0] || '/placeholder-product.svg';
                    const deliveryPoint = [order.deliveryCity, order.deliveryAddress].filter(Boolean).join(', ');
                    return (
                      <Reveal key={order.id} delay={i * 0.04}>
                        {/* Tighter padding/gap/image size on mobile — the
                            previous sizing (built for desktop) left barely
                            any room for the text column on a narrow phone
                            screen, forcing long address/name lines to spill
                            past the card edge instead of truncating cleanly. */}
                        <div className="card-surface flex gap-3 p-3 sm:gap-4 sm:p-5">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-900/5 sm:h-24 sm:w-24">
                            <Image src={cover} alt={order.items[0]?.title ?? ''} fill className="object-cover" unoptimized />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                              <p className="text-xs font-semibold dark:text-cream sm:text-sm">
                                {order.items.length} {dict.orders.items} · {formatPrice(order.totalAmount, locale)}
                              </p>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-3 sm:py-1 sm:text-xs ${
                                    order.paymentStatus === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  }`}
                                >
                                  {order.paymentStatus === 'PAID' ? dict.admin.paid : dict.admin.unpaid}
                                </span>
                                <OrderStatusBadge status={order.status} dict={dict} />
                              </div>
                            </div>
                            <p className="truncate text-[11px] text-ink-900/50 dark:text-cream/50 sm:text-xs">
                              {dict.orders.orderNumber} № {order.orderNumber}
                            </p>
                            {deliveryPoint && (
                              <p className="truncate text-[11px] text-ink-900/50 dark:text-cream/50 sm:text-xs">
                                {dict.profile.deliveryPoint}: {deliveryPoint}
                              </p>
                            )}
                            <p className="truncate text-[11px] text-ink-900/50 dark:text-cream/50 sm:text-xs">
                              {dict.profile.recipient}: {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[11px] text-ink-900/40 dark:text-cream/40 sm:text-xs">{formatDate(order.createdAt, locale)}</p>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>
        ) : (
          <Reveal delay={0.05}>
            <form onSubmit={handleSubmit(handleSaveProfile)} className="card-surface space-y-5 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider">{dict.profile.personalInfo}</h2>
                {/* Pencil = enter edit mode; while editing it swaps to an X
                    (cancel — discards unsaved changes, see toggleEdit). This
                    is now the only way to unlock the fields below; the old
                    always-editable form + separate green submit button was
                    replaced by this explicit view/edit toggle. */}
                <button
                  type="button"
                  onClick={toggleEdit}
                  aria-label={dict.profile.editInfo}
                  title={dict.profile.editInfo}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/5 text-gold-600 transition-colors hover:bg-gold-500/10 dark:border-gold-500/30 dark:text-gold-400"
                >
                  {isEditing ? <X size={16} /> : <Pencil size={15} />}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.firstName}</label>
                  <input
                    disabled={!isEditing}
                    {...register('firstName')}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      isEditing
                        ? 'border-ink-900/15 focus:border-ink-950'
                        : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.lastName}</label>
                  <input
                    disabled={!isEditing}
                    {...register('lastName')}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      isEditing
                        ? 'border-ink-900/15 focus:border-ink-950'
                        : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.phone}</label>
                <input
                  disabled={!isEditing}
                  {...register('phone')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                    isEditing
                      ? 'border-ink-900/15 focus:border-ink-950'
                      : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.address}</label>
                <input
                  disabled={!isEditing}
                  {...register('address')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                    isEditing
                      ? 'border-ink-900/15 focus:border-ink-950'
                      : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.email}</label>
                <input
                  disabled
                  value={data?.me?.email ?? user.email}
                  className="w-full rounded-xl border border-ink-900/10 bg-ink-900/5 px-4 py-3 text-sm text-ink-900/50 outline-none"
                />
              </div>

              {/* "Saqlash" only appears once the pencil icon has unlocked the
                  fields — the old always-visible green submit button is
                  gone. "Accountdan chiqish" stays visible either way and
                  still opens the confirmation modal rather than logging out
                  immediately. */}
              <div className="flex flex-wrap gap-3 pt-1">
                {isEditing && (
                  <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                    {loading ? '…' : dict.profile.save}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/40 bg-red-500/5 px-6 py-3 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-500/10 active:scale-95 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  {dict.profile.logoutAccount}
                </button>
              </div>
            </form>
          </Reveal>
        )}
      </div>

      {/* Rendered through a portal straight into <body>, same reasoning as
          every other overlay in the app: a `fixed inset-0` backdrop nested
          inside a transformed ancestor (Reveal's motion wrapper) would get
          clipped/mispositioned instead of covering the full viewport. */}
      {showLogoutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-900"
            >
              <h3 className="text-base font-bold text-ink-950 dark:text-cream">{dict.profile.logoutConfirmTitle}</h3>
              <p className="mt-2 text-sm text-ink-900/60 dark:text-cream/60">{dict.profile.logoutConfirmBody}</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowLogoutConfirm(false)} className="btn-outline flex-1 !px-4">
                  {dict.profile.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 rounded-full bg-red-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-600 active:scale-95"
                >
                  {dict.profile.confirmLogout}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
