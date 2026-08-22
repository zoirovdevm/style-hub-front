'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { User2, Package, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { GET_ME, GET_MY_ORDERS } from '@/lib/graphql/queries';
import { UPDATE_PROFILE } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import { PhoneInput } from '@/components/ui/PhoneInput';
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

// Strips an optional leading "+998" (with or without a following space) and
// any other non-digit characters, then caps at 9 — turns whatever shape a
// stored phone happens to be in ("+998992132801", "+998 99 213 28 01", or
// even an old pre-+998 bare "975213130") into just the 9-digit tail
// PhoneInput's `value` prop expects. Pairs with `+998${digits}` below to
// reconstruct the full canonical value on every change/save.
function toPhoneDigits(phone: string) {
  return phone.replace(/^\+?998\s*/, '').replace(/\D/g, '').slice(0, 9);
}

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

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>();

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
          without eating vertical space above the content. On desktop
          (lg:) it sticks under the fixed header while the right column
          scrolls normally with the page — see the plain (non-Reveal) div
          below for why. `lg:items-start` on this grid is required for the
          sticky child: without it, grid's default stretch would force the
          nav to match the right column's full height, leaving it nowhere
          to "stick" to since it would already span the whole row. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Deliberately a plain <div>, not <Reveal> — Reveal is a
            framer-motion element that keeps an inline `transform` style
            even at rest (translateY(0)), and ANY transform on an ancestor
            creates a new containing block that breaks `position: sticky`
            on descendants in every browser. The fixed header floats at
            84px tall from the sm: breakpoint up (see [locale]/layout.tsx's
            `<main className="pt-[68px] sm:pt-[84px]">`); `lg:top-[100px]`
            adds a deliberate 16px breathing gap below that instead of
            sitting flush against it. */}
        <div className="lg:sticky lg:top-[100px] lg:self-start">
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
        </div>

        {activeTab === 'orders' ? (
          // `min-w-0` here is load-bearing, not decoration: this is a
          // direct child of the CSS grid above, and grid items default to
          // `min-width: auto` — which lets a descendant's un-wrapped text
          // (long order numbers, addresses) force this whole column, and
          // with it the page, wider than the viewport, no matter how much
          // the card itself further down gets shrunk or truncated. This
          // one override is what actually stops that.
          <Reveal delay={0.05} className="min-w-0">
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
                // Scoped to mobile ONLY — from lg: up (desktop, where the
                // sidebar goes sticky) this list has no cap at all and
                // grows with the page's own single scrollbar, same as
                // always, so the sticky sidebar keeps working exactly like
                // before. Below lg: (phones/tablets, where the sidebar is
                // never sticky in the first place — see the plain <div>
                // above) the list gets its own bounded height and only
                // shows a scrollbar once its content actually doesn't fit;
                // `overflow-y-auto` never shows a scrollbar for content
                // that already fits. The mobile-only `px-3` here (cancelled
                // at sm: since cards go back to matching the column width
                // there) is what gives the cards their narrower inset on
                // phones — see the card itself below for why that's a
                // fixed padding rather than a percentage width.
                <div className="min-w-0 max-w-full max-h-[60vh] space-y-3 overflow-y-auto overscroll-contain px-3 sm:px-0 lg:max-h-none lg:overflow-visible">
                  {orders.map((order: any, i: number) => {
                    const cover = order.items[0]?.product?.images?.[0] || '/placeholder-product.svg';
                    const deliveryPoint = [order.deliveryCity, order.deliveryAddress].filter(Boolean).join(', ');
                    return (
                      <Reveal key={order.id} delay={i * 0.04} className="min-w-0 max-w-full">
                        {/* Badges used to sit beside the price line with
                            `justify-between` + `flex-wrap` on the shared
                            row — on a narrow card that squeezed the
                            "To'lanmadi"/status pair right up against the
                            card's edge before the wrap kicked in, reading
                            as clipped/cramped. They're now always their own
                            row underneath the price instead of sharing one,
                            so there's never a fight for horizontal space,
                            plus the image and every gap/padding value here
                            is a size smaller again, and everything here
                            is smaller still on top of that. The card is a
                            plain `w-full` now — it used to be
                            `w-[92%] mx-auto` to look narrower on phones,
                            but a *percentage* width has to be recomputed
                            against its parent every time that parent's
                            box changes, and on real mobile browsers that
                            recompute could briefly land on a different
                            value mid-scroll, which read as the cards
                            suddenly "growing" wider once you started
                            scrolling. The narrower look on phones now
                            comes entirely from the list wrapper's own
                            fixed `px-3` padding above, which can't wobble
                            like that — the card itself just fills
                            whatever width it's given. */}
                        {/* Sizing below is mobile-first-cramped on purpose
                            (see the long comment above this block) but that
                            was only ever needed on phones/tablets — from
                            `lg:` up there's a full column of desktop width
                            to work with, so the card, image, and every text
                            size step back up to a comfortable reading size
                            there instead of staying thumbnail-sized. */}
                        <div className="card-surface flex w-full min-w-0 max-w-full gap-1.5 p-1.5 lg:gap-4 lg:p-4">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-ink-900/5 lg:h-20 lg:w-20">
                            <Image src={cover} alt={order.items[0]?.title ?? ''} fill className="object-cover" unoptimized />
                          </div>
                          <div className="min-w-0 max-w-full flex-1 space-y-0.5 lg:space-y-1.5">
                            <p className="truncate text-[11px] font-semibold leading-tight dark:text-cream lg:text-base">
                              {order.items.length} {dict.orders.items} · {formatPrice(order.totalAmount, locale)}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold lg:px-3 lg:py-1 lg:text-xs ${
                                  order.paymentStatus === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                }`}
                              >
                                {order.paymentStatus === 'PAID' ? dict.admin.paid : dict.admin.unpaid}
                              </span>
                              <OrderStatusBadge status={order.status} dict={dict} compact />
                            </div>
                            {/* These four lines used to be `truncate`
                                (nowrap + ellipsis) — with a long enough
                                order number or address, `white-space:
                                nowrap` gives the line a min-content width
                                equal to its full unwrapped length, and
                                that's exactly what was reaching up through
                                the grid item above and forcing the page
                                wider than the viewport, regardless of the
                                `overflow:hidden` truncate also sets. They
                                now wrap normally instead. */}
                            <p className="whitespace-normal [overflow-wrap:anywhere] text-[10px] leading-tight text-ink-900/50 dark:text-cream/50 lg:text-sm lg:leading-normal">
                              {dict.orders.orderNumber} № {order.orderNumber}
                            </p>
                            {deliveryPoint && (
                              <p className="whitespace-normal [overflow-wrap:anywhere] text-[10px] leading-tight text-ink-900/50 dark:text-cream/50 lg:text-sm lg:leading-normal">
                                {dict.profile.deliveryPoint}: {deliveryPoint}
                              </p>
                            )}
                            <p className="whitespace-normal [overflow-wrap:anywhere] text-[10px] leading-tight text-ink-900/50 dark:text-cream/50 lg:text-sm lg:leading-normal">
                              {dict.profile.recipient}: {user.firstName} {user.lastName}
                            </p>
                            <p className="whitespace-normal [overflow-wrap:anywhere] text-[10px] leading-tight text-ink-900/40 dark:text-cream/40 lg:text-sm lg:leading-normal">{formatDate(order.createdAt, locale)}</p>
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
          // Same `min-w-0` reasoning as the orders tab's Reveal above —
          // this is the grid's other possible second child, so it needs
          // the same override to not be a blowout risk itself.
          <Reveal delay={0.05} className="min-w-0">
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
                    {...register('firstName', { pattern: /^[^0-9]+$/ })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      isEditing
                        ? 'border-ink-900/15 focus:border-ink-950'
                        : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                    }`}
                  />
                  {isEditing && profileErrors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{dict.auth.nameNoDigits}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.lastName}</label>
                  <input
                    disabled={!isEditing}
                    {...register('lastName', { pattern: /^[^0-9]*$/ })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                      isEditing
                        ? 'border-ink-900/15 focus:border-ink-950'
                        : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                    }`}
                  />
                  {isEditing && profileErrors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{dict.auth.nameNoDigits}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.phone}</label>
                {/* Same PhoneInput used on the register wizard's phone step:
                    the "+998 " prefix is permanently fixed (can't be
                    deleted/selected-over/pasted-over) and only the 9 digits
                    after it are editable, digit-only, capped at 9 — the
                    exact way an earlier account's phone got corrupted to
                    "+998 99b 213 28 01" in the database is no longer
                    possible here. Wired through Controller (rather than
                    plain register()) since PhoneInput is a controlled
                    value/onChange component, not a native <input>. */}
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      value={toPhoneDigits(field.value ?? '')}
                      onChange={(digits) => field.onChange(`+998${digits}`)}
                      disabled={!isEditing}
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${
                        isEditing
                          ? 'border-ink-900/15 focus:border-ink-950'
                          : 'border-ink-900/10 bg-ink-900/5 text-ink-900/50'
                      }`}
                    />
                  )}
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
