'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
const TELEGRAM_USERNAME = 'MZ0526';

export default function CheckoutPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{ orderNumber: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data } = useQuery(GET_MY_CART, { skip: !user });
  const items = data?.myCart ?? [];
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
  } = useForm<CheckoutForm>();

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
          },
        },
      });

      // Stay on this page and show the payment card + Telegram instructions
      // instead of redirecting straight to /orders — the buyer needs those
      // details to actually send the payment.
      setPlacedOrder({ orderNumber: orderData?.createOrder?.orderNumber ?? '' });
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

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
    if (!user) {
      router.push(`/${locale}/login`);
    }
  }, [user, locale, router]);

  if (!user) {
    return null;
  }

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
                href={`https://t.me/${TELEGRAM_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Send size={16} />
                {dict.checkout.sendReceiptTelegram}
              </a>
            </div>

            <button onClick={() => router.push(`/${locale}/orders`)} className="btn-outline w-full">
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
