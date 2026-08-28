'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
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
  reviewsCount?: number;
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
  const router = useRouter();
  const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
  // Reads from the same cache Header/WishlistPage already populate, so this
  // is normally an instant cache hit rather than a fresh network call.
  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });
  const serverWishlisted = wishlistData?.myWishlist?.some((item: any) => item.product?.id === product.id) ?? false;
  // The heart used to only flip once the mutation's refetchQueries came
  // back — a real network round-trip, which read as "the click is waiting
  // on a loader" even though there's no spinner. This local override makes
  // the heart flip the instant you click, before the network call even
  // resolves; the effect below drops the override again once the real
  // server data catches up to it (or on the next click).
  const [optimisticWishlisted, setOptimisticWishlisted] = useState<boolean | null>(null);
  const isWishlisted = optimisticWishlisted ?? serverWishlisted;
  useEffect(() => {
    setOptimisticWishlisted(null);
  }, [wishlistData]);

  const [toggleWishlist] = useMutation(TOGGLE_WISHLIST, {
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
      {/* Sits OUTSIDE the <Link> below (as a sibling, not a nested
          descendant) — it used to be nested inside the Link, and even
          though its own onClick called preventDefault(), that ran too
          late: RouteProgressBar (globals.css's top loading bar) listens
          for clicks on the whole document in the CAPTURE phase, which
          fires before any handler further down the tree including this
          button's. It saw a click land inside an <a> pointing somewhere
          new and lit up the top progress bar, even though navigation was
          about to be cancelled a moment later — that's the "loader"
          showing up on every like click. Moving the button out from under
          the Link means clicks on it never touch an anchor at all, so
          RouteProgressBar has nothing to react to. Positioned absolutely
          to land in the same top-right spot over the image as before. */}
      <button
        onClick={(e) => {
          e.preventDefault();
          if (!user) {
            router.push(`/${locale}/login`);
            return;
          }
          const next = !isWishlisted;
          setOptimisticWishlisted(next);
          toggleWishlist({ variables: { productId: product.id } }).catch(() => setOptimisticWishlisted(!next));
        }}
        aria-label={isWishlisted ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
        className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-soft transition-all duration-300 ${
          isWishlisted ? 'bg-white/40 text-red-500' : 'bg-white/40 text-ink-900'
        }`}
      >
        <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} className="transition-colors" />
      </button>

      {/* Single rounded surface wrapping image + info + button — the card
          "box" itself, so the whole thing reads as one unit instead of a
          bare image with text floating below it. overflow-hidden clips the
          image's top corners to this box's own radius instead of the image
          carrying its own separate radius. Image aspect ratio (and
          therefore the card's overall width/height) is untouched — only the
          wrapper/padding/radius around it changed. rounded-xl = 0.75rem
          (12px), per request — also matched by the quick-buy button below. */}
      <div className="overflow-hidden rounded-xl border border-ink-900/8 bg-white transition-shadow duration-300 hover:shadow-soft dark:border-cream/10 dark:bg-ink-900">
        {/* prefetch={false}: a product grid can render 8-20+ of these cards
            at once, and Next.js's default Link behavior background-fetches
            each one's route data as it scrolls into view. On a fast/low-
            latency connection that's invisible; on a high-RTT connection
            (confirmed via screen recording: iPhone on LTE, ~250-300ms+ to
            a US-hosted server) those background prefetches compete for the
            same limited-throughput connection as the page's own critical
            JS chunks and images — directly delaying when React finishes
            hydrating and buttons/links start responding to taps. Turning
            prefetch off here doesn't change what clicking the card does
            (it still navigates instantly on tap, just fetches at click-time
            instead of pre-fetching in the background) — only removes the
            competing background requests. */}
        <Link href={`/${locale}/product/${product.slug}`} className="block" prefetch={false}>
          <div className="relative aspect-[3/4] overflow-hidden bg-ink-900/5">
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
          </div>

          <div className="space-y-1 px-4 pt-3">
            {/* Category (left) and price (right) now share the TOP row —
                price sits level with "Рубашка" instead of down next to the
                title — and the price got a bigger font-size to read as the
                dominant number in that row. Title moves to its own line
                below. */}
            <div className="flex items-start justify-between gap-2">
              {categoryName ? (
                <p className="min-w-0 truncate text-[11px] uppercase tracking-wider text-ink-900/40 dark:text-cream/40">{categoryName}</p>
              ) : (
                <span />
              )}
              {/* Chegirma bo'lganda eski (chizilgan) narx endi joriy narx
                  bilan bitta qatorda emas, ustma-ust (yangi narx ustida,
                  eskisi ostida) joylashadi — ikkalasi bir qatorda yonma-yon
                  turgani, tor mobil kartalarda (2 ustunli grid) narxlar
                  uzun bo'lganda kartadan tashqariga chiqib, qo'shni
                  kartaning ustiga yozilib ketishiga sabab bo'lgan edi. */}
              <div className="flex min-w-0 shrink flex-col items-end leading-tight">
                <span className="whitespace-nowrap text-[15px] font-bold text-gold-600 dark:text-gold-400 sm:text-[17px]">
                  {formatPrice(product.price, locale)}
                </span>
                {hasDiscount && (
                  <span className="whitespace-nowrap text-[10px] text-ink-900/40 line-through dark:text-cream/40 sm:text-xs">
                    {formatPrice(product.oldPrice!, locale)}
                  </span>
                )}
              </div>
            </div>
            <h3 className="truncate text-sm font-semibold text-ink-950 dark:text-cream">{title}</h3>
            {/* Total stock, visible right on the card — same "N dona qoldi"
                wording used on the product detail page, so a shopper can
                gauge availability before even opening the product. Out of
                stock (0) keeps its own distinct red "unavailable" state;
                1-5 left keeps the amber "almost gone" color, but per request
                without the extra "almostGone" text suffix — the color alone
                signals urgency now, and anything above 5 stays the plain
                neutral gray count. */}
            {typeof product.stock === 'number' && (
              <p
                className={`text-[11px] font-semibold ${
                  product.stock === 0
                    ? 'text-red-500'
                    : product.stock <= 5
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-ink-900/40 dark:text-cream/40'
                }`}
              >
                {product.stock === 0 ? dict.product.outOfStock : `${product.stock} ${dict.product.stockLeft}`}
              </p>
            )}
            {/* Rating, at the very bottom of the info block — one filled
                yellow star (deliberately a literal yellow, not the site's
                green accent, since a star rating reads by convention) plus
                the number and review count in parentheses. Always renders
                (reserving the same line height on every card) but goes
                `invisible` when the product has no rating yet — hiding the
                condition entirely used to make those cards a whole line
                shorter than their neighbors, breaking the grid row's
                height. `invisible` keeps the layout space without showing
                a misleading "0.0 (0 reviews)" to shoppers. */}
            <p
              className={`flex items-center gap-1 text-[11px] font-semibold text-ink-900/60 dark:text-cream/60 ${
                typeof product.rating === 'number' && product.rating > 0 ? '' : 'invisible'
              }`}
            >
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {(product.rating ?? 0).toFixed(1)} ({product.reviewsCount ?? 0} {dict.product.reviews})
            </p>
          </div>
        </Link>

        {/* Sits outside the card's <Link> so tapping it doesn't navigate to
            the product page — opens the quick-buy modal instead. */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsQuickBuyOpen(true);
            }}
            disabled={product.stock === 0}
            // Root cause of every earlier "nothing changed" report: .btn-primary
            // (globals.css) was plain CSS placed after `@tailwind utilities`
            // instead of inside `@layer components`, so its own baked-in
            // gap-2/px-6/py-3/text-sm always won the cascade tie against a
            // plain (non-!important) override here — ONLY properties marked
            // `!important` (like !rounded-*) were ever actually applying.
            // The font-size was silently stuck at 14px (text-sm) this whole
            // time regardless of what text-[Npx] was written below, which is
            // why "Купить в 1 клик" was wrapping onto 2 lines. globals.css is
            // now fixed (both classes moved into @layer components), and
            // every utility here is additionally marked `!important` as a
            // belt-and-suspenders guarantee. whitespace-nowrap forces a
            // single line outright instead of relying on the text simply
            // fitting.
            className="btn-primary mt-1.5 flex w-full items-center justify-center whitespace-nowrap !gap-1 !rounded-lg !px-2 !py-1 !text-[10px] disabled:cursor-not-allowed disabled:opacity-40 sm:mt-2 sm:!gap-1.5 sm:!rounded-xl sm:!px-4 sm:!py-1.5 sm:!text-xs"
          >
            {/* ShoppingBag instead of the lightning bolt, per request — same
                icon the navbar already uses for the cart, so "buy"/"cart"
                actions read as one consistent glyph across the site rather
                than two different icons for the same idea. Left as a plain
                outline (no fill) to match how the navbar renders it. */}
            <ShoppingBag className="h-2.5 w-2.5 shrink-0 sm:h-3.5 sm:w-3.5" />
            {dict.product.quickBuy}
          </button>
        </div>
      </div>

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
