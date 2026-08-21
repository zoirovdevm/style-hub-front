'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { Copy, Send } from 'lucide-react';
import { GET_MY_CART } from '@/lib/graphql/queries';
import { CREATE_ORDER } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice } from '@/lib/utils/format';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface CheckoutForm {
  deliveryAddress: string;
  deliveryCity: string;
  phone: string;
  note: string;
}

// Real Click/Payme merchant credentials aren't configured yet, so payment is
// coordinated manually: the buyer transfers to this card and sends the
// receipt via Telegram. Centralized here since it's shown both after order
// placement and could be reused elsewhere.
const PAYMENT_CARD_NUMBER = '4073 4200 2305 8815';
const PAYMENT_CARD_HOLDER = 'Muhammadjon Zoirov';

// `placedOrder` below is plain component state, so it's normally lost the
// moment this component remounts — e.g. a locale switch, or (very commonly
// on mobile) the browser discarding this background tab while the buyer is
// away in the Telegram app and reloading it when they come back. Mirroring
// it here lets a fresh mount restore the payment-confirmation screen instead
// of silently dropping the buyer back onto a blank checkout form.
const PLACED_ORDER_STORAGE_KEY = 'checkout:lastPlacedOrder';
// Falls back to the admin's personal account if the bot isn't configured
// yet (NEXT_PUBLIC_TELEGRAM_BOT_USERNAME empty in .env.local) — otherwise
// deep-links straight into the bot with ?start=order_<id>, so the bot can
// bind the buyer's chat to this exact order automatically.
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
const TELEGRAM_FALLBACK_USERNAME = 'MZ0526';

// useSearchParams() opts the calling component out of static prerendering
// unless it's wrapped in <Suspense> — without this wrapper `next build`
// fails with "useSearchParams() should be wrapped in a suspense boundary"
// (same fix already applied to the verify-email page for the same reason).
export default function CheckoutPage({ params }: { params: { locale: Locale } }) {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner params={params} />
    </Suspense>
  );
}

function CheckoutPageInner({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // zustand's persist middleware reads localStorage asynchronously — right
  // after a fresh mount `user` is still `null` for one tick even when a
  // valid session exists. Gating the login-redirect effect on this (instead
  // of just `!user`) stops a still-logged-in buyer from being bounced to
  // /login the instant this page remounts.
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNumber: string; totalAmount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // ?items=id1,id2 — set by the cart page when the buyer checked out only
  // some of their cart, not the whole thing (its checkbox selection). Absent
  // entirely (arriving from "Buy now"/1-click-buy, or /checkout with nothing
  // selected) means "the whole cart", exactly like before this existed.
  const searchParams = useSearchParams();
  const itemsParam = searchParams.get('items');
  const selectedItemIds = useMemo(
    () => (itemsParam ? itemsParam.split(',').filter(Boolean) : null),
    [itemsParam],
  );

  const { data, loading: cartLoading } = useQuery(GET_MY_CART, { skip: !user });
  const allCartItems = data?.myCart ?? [];
  const items = selectedItemIds
    ? allCartItems.filter((i: any) => selectedItemIds.includes(i.id))
    : allCartItems;
  const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.product.price) * i.quantity, 0);

  // createOrder deletes the user's cart items server-side, but that doesn't
  // touch Apollo's client cache — without this, the cart page/badge kept
  // showing the just-purchased items as if checkout had done nothing.
  const [createOrder] = useMutation(CREATE_ORDER, {
    refetchQueries: [{ query: GET_MY_CART }],
    awaitRefetchQueries: true,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({ defaultValues: { phone: '+998 ' } });

  // Real Click/Payme merchant credentials aren't set up yet, so online
  // payment selection is hidden — every order goes through as "to be
  // arranged", and payment itself is coordinated manually via Telegram
  // (see the contact note rendered below).
  async function onSubmit(values: CheckoutForm) {
    setSubmitting(true);
    setError(null);
    try {
      const { data: orderData } = await createOrder({
        variables: {
          input: {
            deliveryAddress: values.deliveryAddress,
            deliveryCity: values.deliveryCity,
            phone: values.phone,
            note: values.note,
            paymentMethod: 'CASH',
            // undefined (not []) when nothing was pre-selected, so the
            // backend's own "omitted = whole cart" fallback applies.
            itemIds: selectedItemIds ?? undefined,
          },
        },
      });

      // Stay on this page and show the payment card + Telegram instructions
      // instead of redirecting straight to /orders — the buyer needs those
      // details to actually send the payment.
      const order = {
        id: orderData?.createOrder?.id ?? '',
        orderNumber: orderData?.createOrder?.orderNumber ?? '',
        totalAmount: orderData?.createOrder?.totalAmount ?? 0,
      };
      setPlacedOrder(order);
      try {
        sessionStorage.setItem(PLACED_ORDER_STORAGE_KEY, JSON.stringify(order));
      } catch {
        // sessionStorage can throw in some privacy modes — safe to ignore.
      }
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  // Restore the payment-confirmation screen after a remount (see the
  // `PLACED_ORDER_STORAGE_KEY` note above). Only restores while the cart is
  // confirmed empty — that's the state right after a real order was placed.
  // If the buyer has since added new items (a genuinely new checkout), the
  // cart won't be empty, so we drop the stale entry and show the form
  // instead of re-showing a finished order's payment details.
  useEffect(() => {
    if (placedOrder || cartLoading) return;
    try {
      const raw = sessionStorage.getItem(PLACED_ORDER_STORAGE_KEY);
      if (!raw) return;
      if (items.length === 0) {
        setPlacedOrder(JSON.parse(raw));
      } else {
        sessionStorage.removeItem(PLACED_ORDER_STORAGE_KEY);
      }
    } catch {
      // sessionStorage can throw in some privacy modes — safe to ignore.
    }
  }, [cartLoading, items.length, placedOrder]);

  function copyCardNumber() {
    navigator.clipboard.writeText(PAYMENT_CARD_NUMBER.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Redirecting here must happen in an effect, not directly in the render
  // body — calling router.push() synchronously during render can run while
  // Next.js is statically prerendering this page (no browser `location`
  // global exists then), which throws "ReferenceError: location is not
  // defined" and fails `next build`.
  useEffect(() => {
    if (hasHydrated && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, hasHydrated, locale, router]);

  // While the session is still rehydrating from storage we don't yet know
  // whether the buyer is logged in — showing the same loading spinner as the
  // cart-loading case below avoids a false "not logged in" flash/redirect.
  if (!hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // First load only — without this the order summary briefly showed "0
  // items" / an empty list and a clickable-looking submit button before the
  // cart had actually loaded.
  if (cartLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  // With the bot configured, `?start=order_<id>` deep-links straight into
  // it — the bot then knows exactly which order this chat belongs to the
  // moment the buyer opens it (see TelegramService.bot.start() on the
  // backend), so screenshots get matched automatically with no manual
  // order-number typing needed. Falls back to the old pre-filled-text link
  // to the admin's personal account if the bot isn't set up yet.
  const telegramHref = TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=order_${placedOrder?.id ?? ''}`
    : (() => {
        const telegramText = placedOrder
          ? `${dict.orders.orderNumber}: ${placedOrder.orderNumber}\n${dict.orders.total}: ${formatPrice(placedOrder.totalAmount, locale)}\n${dict.checkout.telegramReceiptMessage}`
          : '';
        return `https://t.me/${TELEGRAM_FALLBACK_USERNAME}?text=${encodeURIComponent(telegramText)}`;
      })();

  if (placedOrder) {
    return (
      <div className="container-app py-20">
        <Reveal>
          <div className="mx-auto max-w-md card-surface space-y-5 p-8 text-center">
            <h1 className="font-display text-2xl font-medium">{dict.checkout.orderPlacedTitle}</h1>
            <p className="text-xs text-ink-900/50">
              {dict.checkout.orderPlacedSubtitle}: <span className="font-mono font-semibold">{placedOrder.orderNumber}</span>
            </p>

            <div className="space-y-3 rounded-xl border border-ink-900/10 bg-ink-900/[0.03] p-5 text-left dark:border-cream/10 dark:bg-cream/5">
              <p className="text-sm text-ink-900/70 dark:text-cream/70">{dict.checkout.paymentCardInstructions}</p>
              <button
                onClick={copyCardNumber}
                className="flex w-full items-center justify-between rounded-lg border border-ink-900/15 bg-white px-4 py-3 font-mono text-base font-bold dark:border-cream/15 dark:bg-ink-800 dark:text-cream"
              >
                <span>{PAYMENT_CARD_NUMBER}</span>
                <Copy size={16} className="text-ink-900/40" />
              </button>
              {copied && <p className="text-xs font-semibold text-emerald-600">✓</p>}
              <p className="text-xs text-ink-900/50 dark:text-cream/50">
                {dict.checkout.cardHolder}: <span className="font-semibold">{PAYMENT_CARD_HOLDER}</span>
              </p>
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Send size={16} />
                {dict.checkout.sendReceiptTelegram}
              </a>
            </div>

            <button
              onClick={() => {
                try {
                  sessionStorage.removeItem(PLACED_ORDER_STORAGE_KEY);
                } catch {
                  // sessionStorage can throw in some privacy modes — safe to ignore.
                }
                router.push(`/${locale}/orders`);
              }}
              className="btn-outline w-full"
            >
              {dict.checkout.goToOrders}
            </button>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-app py-12">
      <Reveal>
        <h1 className="section-title">{dict.checkout.title}</h1>
      </Reveal>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Reveal>
            <div className="card-surface space-y-5 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider">{dict.checkout.deliveryInfo}</h2>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.address}</label>
                <input
                  {...register('deliveryAddress', { required: true, minLength: 5 })}
                  className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                />
                {errors.deliveryAddress && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.city}</label>
                  <input
                    {...register('deliveryCity')}
                    className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.phone}</label>
                  <input
                    {...register('phone', { required: true })}
                    placeholder="+998 90 123 45 67"
                    className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.note}</label>
                <textarea
                  {...register('note')}
                  rows={3}
                  className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                />
              </div>
            </div>
          </Reveal>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <Reveal delay={0.15}>
          <div className="card-surface sticky top-28 space-y-4 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">{dict.checkout.orderSummary}</h2>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between gap-2 text-xs text-ink-900/60">
                  <span className="max-w-[70%]">
                    <span className="block truncate">
                      {item.product.title} × {item.quantity}
                    </span>
                    {(item.size || item.color) && (
                      <span className="text-ink-900/40">{[item.size, item.color].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                  <span className="shrink-0">{formatPrice(item.product.price * item.quantity, locale)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-900/10 pt-4 text-base font-bold">
              <span>{dict.cart.total}</span>
              <span>{formatPrice(subtotal, locale)}</span>
            </div>
            <button type="submit" disabled={submitting || items.length === 0} className="btn-primary w-full disabled:opacity-50">
              {submitting ? '…' : dict.checkout.placeOrder}
            </button>
          </div>
        </Reveal>
      </form>
    </div>
  );
}
