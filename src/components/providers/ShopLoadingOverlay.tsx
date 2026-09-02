'use client';

import { useShopLoadingStore } from '@/lib/store/shop-loading-store';
import { ShopSkeleton } from '@/components/shop/ShopSkeleton';

/**
 * Always mounted (Providers.tsx → every page), so it's already sitting in
 * the DOM BEFORE a shopper ever clicks into /shop — unlike
 * `shop/loading.tsx`, which only exists once Next.js has actually started
 * rendering the /shop route segment. That's exactly why this one can
 * react the instant `useShopLoadingStore`'s `pending` flips true (see
 * that store for the full why): it doesn't have to wait for any part of
 * the new page to arrive first.
 *
 * `fixed inset-0` deliberately overlaps the Header (which is `fixed`,
 * z-50) — this sits at z-40, one layer below, so the header stays visible
 * and usable (and RouteProgressBar's own top line, z-200, still shows on
 * top of everything) while the skeleton covers whatever page is
 * underneath (still the OLD page — Home, or the shop grid before a filter
 * click — until the real /shop content is ready to swap in).
 */
export function ShopLoadingOverlay() {
  const pending = useShopLoadingStore((s) => s.pending);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream dark:bg-ink-950">
      <ShopSkeleton />
    </div>
  );
}
