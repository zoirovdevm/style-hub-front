'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { TOGGLE_WISHLIST } from '@/lib/graphql/mutations';
import { GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice } from '@/lib/utils/format';
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
}

export function ProductCard({ product, locale }: { product: ProductCardData; locale: Locale }) {
  const user = useAuthStore((s) => s.user);
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const cover = product.images?.[0] ? `${apiUrl}${product.images[0]}` : '/placeholder-product.svg';
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
          {categoryName && <p className="text-[11px] uppercase tracking-wider text-ink-900/40">{categoryName}</p>}
          <h3 className="truncate text-sm font-semibold text-ink-950">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-ink-950">{formatPrice(product.price, locale)}</span>
            {hasDiscount && (
              <span className="text-xs text-ink-900/40 line-through">{formatPrice(product.oldPrice!, locale)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
