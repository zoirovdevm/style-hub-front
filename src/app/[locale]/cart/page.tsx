'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from '@apollo/client';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { GET_MY_CART } from '@/lib/graphql/queries';
import { UPDATE_CART_ITEM, REMOVE_CART_ITEM } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice } from '@/lib/utils/format';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

// A product with size/color variants can have a different stock number per
// exact combination — the overall `product.stock` is just the sum across
// all of them, so it's the wrong number to cap a specific cart line's
// quantity against (it can let you over-order a nearly sold-out combo, or
// under-cap one that still has plenty left).
function stockLimitFor(item: any): number {
  const variants = item.product?.variants ?? [];
  if (!variants.length) return item.product.stock;
  const match = variants.find((v: any) => v.size === (item.size ?? '') && v.color === (item.color ?? ''));
  return match ? match.stock : item.product.stock;
}

export default function CartPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const user = useAuthStore((s) => s.user);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_MY_CART, { skip: !user });
  const [updateItem] = useMutation(UPDATE_CART_ITEM, { refetchQueries: [{ query: GET_MY_CART }] });
  const [removeItem] = useMutation(REMOVE_CART_ITEM, { refetchQueries: [{ query: GET_MY_CART }] });

  const items = data?.myCart ?? [];
  const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.product.price) * i.quantity, 0);

  // Previously these mutations had no .catch/try-catch at all — a rejected
  // promise (e.g. quantity capped to 0, or a network hiccup) just vanished
  // and the button visibly "did nothing" with no clue why.
  async function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setErrorMessage(null);
    try {
      await updateItem({ variables: { input: { id: itemId, quantity } } });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleRemove(itemId: string) {
    setErrorMessage(null);
    try {
      await removeItem({ variables: { id: itemId } });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  }

  // First load only (query is skipped entirely while logged out, so `loading`
  // stays false and this never fires for guests) — show a spinner instead of
  // a half-rendered/empty cart while the request is still in flight.
  if (user && loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  if (!user || (!loading && items.length === 0)) {
    return (
      <div className="container-app flex flex-col items-center py-32 text-center">
        <ShoppingBag size={40} className="text-ink-900/20" />
        <p className="mt-4 text-sm text-ink-900/50">{dict.cart.empty}</p>
        <p className="text-xs text-ink-900/40">{dict.cart.emptySubtitle}</p>
        <Link href={`/${locale}/shop`} className="btn-primary mt-6">
          {dict.cart.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-12">
      <Reveal>
        <h1 className="section-title">{dict.cart.title}</h1>
      </Reveal>

      {errorMessage && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item: any) => {
            const cover = item.product.images?.[0] || '/placeholder-product.svg';
            const title = locale === 'ru' && item.product.titleRu ? item.product.titleRu : item.product.title;
            return (
              <Reveal key={item.id}>
                <div className="flex gap-4 rounded-2xl border border-ink-900/5 bg-white p-4 shadow-soft dark:border-cream/10 dark:bg-ink-800">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-900/5">
                    <Image src={cover} alt={title} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold dark:text-cream">{title}</h3>
                      <p className="text-xs text-ink-900/50">
                        {[item.size, item.color].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-full border border-ink-900/15 px-3 py-1.5">
                        <button onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}>
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, Math.min(stockLimitFor(item), item.quantity + 1))}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-bold">{formatPrice(item.product.price * item.quantity, locale)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="self-start text-ink-900/30 hover:text-red-500"
                    aria-label={dict.cart.remove}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="card-surface sticky top-28 space-y-4 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">{dict.checkout.orderSummary}</h2>
            <div className="flex items-center justify-between text-sm text-ink-900/60">
              <span>{dict.cart.subtotal}</span>
              <span>{formatPrice(subtotal, locale)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-ink-900/10 pt-4 text-base font-bold">
              <span>{dict.cart.total}</span>
              <span>{formatPrice(subtotal, locale)}</span>
            </div>
            <Link href={`/${locale}/checkout`} className="btn-primary w-full">
              {dict.cart.checkout}
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
