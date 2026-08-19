'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { AlertCircle, Minus, Plus, X } from 'lucide-react';
import { ADD_TO_CART } from '@/lib/graphql/mutations';
import { GET_MY_CART } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import { formatPrice } from '@/lib/utils/format';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

interface QuickBuyProduct {
  id: string;
  title: string;
  titleRu?: string;
  price: number;
  images: string[];
  sizes?: string[];
  colors?: string[];
  variants?: { size: string; color: string; stock: number }[];
  stock?: number;
}

interface QuickBuyModalProps {
  product: QuickBuyProduct;
  locale: Locale;
  dict: Dictionary;
  onClose: () => void;
}

/**
 * The homepage's product cards don't have room for a full size/color
 * picker like the product detail page's ProductActions does, but "1-click
 * buy" still needs the shopper to pick a size/color before an order can
 * actually be created (the backend requires them whenever a product has
 * variants). This modal is the minimal version of that same picker,
 * reusing the exact same stock-lookup logic and add-to-cart-then-checkout
 * flow as ProductActions' "Buy now" button — just triggered from a card
 * instead of the product page.
 */
export function QuickBuyModal({ product, locale, dict, onClose }: QuickBuyModalProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];
  const variants = product.variants ?? [];
  const hasSizeDim = sizes.length > 0;
  const hasColorDim = colors.length > 0;
  const hasVariants = variants.length > 0;

  function stockFor(size: string, color: string): number | null {
    if (!hasVariants) return null;
    const match = variants.find(
      (v) => v.size === (hasSizeDim ? size : '') && v.color === (hasColorDim ? color : ''),
    );
    return match ? match.stock : 0;
  }

  function isSizeAvailable(s: string): boolean {
    if (!hasVariants) return true;
    if (hasColorDim) return colors.some((c) => (stockFor(s, c) ?? 0) > 0);
    return (stockFor(s, '') ?? 0) > 0;
  }

  function isColorAvailable(c: string, currentSize: string): boolean {
    if (!hasVariants) return true;
    return (stockFor(currentSize, c) ?? 0) > 0;
  }

  const firstAvailableSize = sizes.find((s) => isSizeAvailable(s)) ?? '';
  const [size, setSize] = useState(firstAvailableSize);
  const firstAvailableColor = colors.find((c) => isColorAvailable(c, firstAvailableSize)) ?? '';
  const [color, setColor] = useState(firstAvailableColor);
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedVariantStock = stockFor(size, color);
  const outOfStock = (product.stock ?? 1) <= 0 || (hasVariants && selectedVariantStock !== null && selectedVariantStock <= 0);

  const [addToCart] = useMutation(ADD_TO_CART, {
    refetchQueries: [{ query: GET_MY_CART }],
  });

  const title = locale === 'ru' && product.titleRu ? product.titleRu : product.title;
  // There's no real per-color photo in the data model yet (variants only
  // track size/color/stock, not images) — as a lightweight approximation,
  // if the product has multiple photos we cycle through them by the
  // selected color's position in the colors list, so picking a different
  // color at least shows a different shot instead of a static image. Falls
  // back to the first photo whenever that mapping doesn't apply.
  const images = product.images?.length ? product.images : ['/placeholder-product.svg'];
  const colorIndex = hasColorDim ? colors.indexOf(color) : -1;
  const cover = colorIndex >= 0 && images[colorIndex] ? images[colorIndex] : images[0];

  async function handleConfirm() {
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    if (hasSizeDim && !size) {
      setErrorMessage(dict.product.quickBuySelectSize);
      return;
    }
    if (hasColorDim && !color) {
      setErrorMessage(dict.product.quickBuySelectColor);
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await addToCart({ variables: { input: { productId: product.id, size, color, quantity } } });
      router.push(`/${locale}/checkout`);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
      setSubmitting(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-surface relative max-h-[90vh] w-full max-w-sm space-y-5 overflow-y-auto p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={dict.product.quickBuyClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-900/60 shadow-soft transition-colors hover:bg-white hover:text-ink-950 dark:bg-ink-800/80 dark:text-cream/60 dark:hover:bg-ink-800 dark:hover:text-cream"
        >
          <X size={18} />
        </button>

        <div className="relative -mx-6 -mt-6 aspect-square w-[calc(100%+3rem)] overflow-hidden bg-ink-900/5">
          <Image src={cover} alt={title} fill className="object-cover" unoptimized />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-950 dark:text-cream">{title}</h3>
          <p className="mt-1 text-lg font-bold text-ink-950 dark:text-cream">{formatPrice(product.price, locale)}</p>
        </div>

        {hasSizeDim && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">
              {dict.product.size}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const available = isSizeAvailable(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (!available) return;
                      setSize(s);
                      setErrorMessage(null);
                    }}
                    disabled={!available}
                    title={!available ? dict.product.outOfStock : undefined}
                    className={`h-9 min-w-9 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                      !available
                        ? 'cursor-not-allowed border-ink-900/10 text-ink-900/30 line-through dark:border-cream/10 dark:text-cream/25'
                        : size === s
                          ? 'border-ink-950 bg-ink-950 text-cream dark:border-cream dark:bg-cream dark:text-ink-950'
                          : 'border-ink-900/15 hover:border-ink-950 dark:border-cream/20 dark:text-cream dark:hover:border-cream'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasColorDim && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">
              {dict.product.color}
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const available = isColorAvailable(c, size);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (!available) return;
                      setColor(c);
                      setErrorMessage(null);
                    }}
                    disabled={!available}
                    title={!available ? dict.product.outOfStock : undefined}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      !available
                        ? 'cursor-not-allowed border-ink-900/10 text-ink-900/30 line-through dark:border-cream/10 dark:text-cream/25'
                        : color === c
                          ? 'border-ink-950 bg-ink-950 text-cream dark:border-cream dark:bg-cream dark:text-ink-950'
                          : 'border-ink-900/15 hover:border-ink-950 dark:border-cream/20 dark:text-cream dark:hover:border-cream'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">
            {dict.product.quantity}
          </p>
          <div className="flex w-fit items-center gap-4 rounded-full border border-ink-900/15 px-4 py-2 dark:border-cream/20">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="minus" className="dark:text-cream">
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-semibold dark:text-cream">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(selectedVariantStock ?? product.stock ?? 99, q + 1))}
              aria-label="plus"
              className="dark:text-cream"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={outOfStock || submitting}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {outOfStock ? dict.product.outOfStock : dict.product.buyNow}
        </button>
      </div>
    </div>
  );

  // Rendered into document.body via a portal rather than in place. The card
  // this modal is opened from lives inside a framer-motion <motion.div>,
  // and Framer Motion sets an inline `transform` style on that wrapper —
  // which makes it a CSS "containing block" for any descendant with
  // `position: fixed`. Without the portal, this modal's fixed overlay was
  // being positioned/clipped relative to that small card instead of the
  // full viewport (the confined, off-center box some shoppers saw). A
  // portal renders straight into <body>, outside that transformed
  // ancestor, so `fixed inset-0` always covers the whole screen and stays
  // centered no matter which card triggered it.
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
