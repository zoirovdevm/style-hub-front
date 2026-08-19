'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { TOGGLE_WISHLIST } from '@/lib/graphql/mutations';
import { GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice } from '@/lib/utils/format';
import { QuickBuyModal } from '@/components/product/QuickBuyModal';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export interface ProductCardData {
  id: string;
  title: string;
  titleRu?: string;
  slug: string;
  price: number;
  oldPrice?: number;
  images: string[];
  category?: { name: string; nameRu?: string };
  rating: number;
  stock?: number;
  sizes?: string[];
  colors?: string[];
  variants?: { size: string; color: string; stock: number }[];
}

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: ProductCardData;
  locale: Locale;
  dict: Dictionary;
}) {
  const user = useAuthStore((s) => s.user);
  const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
  // Reads from the same cache Header/WishlistPage already populate, so this
  // is normally an instant cache hit rather than a fresh network call.
  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });
  const isWishlisted = wishlistData?.myWishlist?.some((item: any) => item.product?.id === product.id) ?? false;
  const [toggleWishlist, { loading: togglingWishlist }] = useMutation(TOGGLE_WISHLIST, {
    refetchQueries: [{ query: GET_MY_WISHLIST }],
  });

  const title = locale === 'ru' && product.titleRu ? product.titleRu : product.title;
  const categoryName =
    locale === 'ru' && product.category?.nameRu ? product.category.nameRu : product.category?.name;
  // Relative path — resolves against whatever host the browser is on
  // (localhost or a tunnel URL); next.config.js rewrites /uploads/* through
  // to the backend either way, so this works without any .env switching.
  const cover = product.images?.[0] || '/placeholder-product.svg';
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3 }} className="group relative">
      <Link href={`/${locale}/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-900/5">
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
          {hasDiscount && (
            <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-ink-950">
              -{Math.round(100 - (product.price / product.oldPrice!) * 100)}%
            </span>
          )}
          {user && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (togglingWishlist) return;
                toggleWishlist({ variables: { productId: product.id } });
              }}
              aria-label={isWishlisted ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
              // Always visible (not hover-only) so this works on touch
              // devices too, not just desktop with a mouse.
              className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-soft transition-all duration-300 ${
                isWishlisted ? 'bg-gold-500 text-ink-950' : 'bg-white/90 text-ink-900 hover:bg-white'
              }`}
            >
              <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-ink-950 dark:text-cream">{formatPrice(product.price, locale)}</span>
            {hasDiscount && (
              <span className="text-xs text-ink-900/40 line-through dark:text-cream/40">{formatPrice(product.oldPrice!, locale)}</span>
            )}
          </div>
          {categoryName && <p className="text-[11px] uppercase tracking-wider text-ink-900/40 dark:text-cream/40">{categoryName}</p>}
          <h3 className="truncate text-sm font-semibold text-ink-950 dark:text-cream">{title}</h3>
          {/* Total stock, visible right on the card — same "N dona qoldi"
              wording used on the product detail page, so a shopper can
              gauge availability before even opening the product. */}
          {typeof product.stock === 'number' && (
            <p
              className={`text-[11px] font-semibold ${
                product.stock === 0
                  ? 'text-red-500'
                  : product.stock <= 5
                    ? 'text-red-500'
                    : 'text-ink-900/40 dark:text-cream/40'
              }`}
            >
              {product.stock === 0
                ? locale === 'ru'
                  ? 'Нет в наличии'
                  : "Tugagan"
                : `${product.stock} ${locale === 'ru' ? 'шт. осталось' : 'dona qoldi'}`}
            </p>
          )}
        </div>
      </Link>

      {/* Sits outside the card's <Link> so tapping it doesn't navigate to
          the product page — opens the quick-buy modal instead. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsQuickBuyOpen(true);
        }}
        disabled={product.stock === 0}
        className="btn-primary mt-2 flex w-full items-center justify-center gap-1.5 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap size={13} fill="currentColor" />
        {dict.product.quickBuy}
      </button>

      {isQuickBuyOpen && (
        <QuickBuyModal
          product={product}
          locale={locale}
          dict={dict}
          onClose={() => setIsQuickBuyOpen(false)}
        />
      )}
    </motion.div>
  );
}
