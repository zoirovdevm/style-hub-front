// Shop-specific Suspense fallback — Next.js App Router picks the MOST
// SPECIFIC loading.tsx for a route, so this one replaces the generic
// single-spinner fallback (../loading.tsx) only for /shop, while Home,
// product detail, etc. keep using that plain spinner untouched.
//
// Per request ("uzum marketga uxshab" — like the Uzum Market app): instead
// of a blank spinner, show placeholder cards shaped like the real product
// grid (same column counts, same card proportions) with a moving shimmer,
// so the page already "looks like itself" the instant you click into Shop
// — then Next.js swaps this out for the real, data-filled grid the moment
// the server fetch (shop/page.tsx) resolves. No JS/data here — this file
// must render instantly, before any product data exists.
const SKELETON_CARD_COUNT = 12;

function ShimmerBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export default function ShopLoading() {
  return (
    <div className="container-app py-12">
      <ShimmerBlock className="h-8 w-40" />

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        {/* Mirrors ShopFilters' own lg:w-64 column width so nothing shifts
            horizontally once the real (data-filled) sidebar mounts. Hidden
            below lg, same as the real sidebar's collapsed-by-default
            mobile behavior. */}
        <div className="hidden shrink-0 space-y-8 lg:block lg:w-64">
          <ShimmerBlock className="h-4 w-20" />
          <div className="space-y-2">
            <ShimmerBlock className="h-4 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <ShimmerBlock key={i} className="h-8 w-full !rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            <ShimmerBlock className="h-4 w-16" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShimmerBlock key={i} className="h-9 w-9 !rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <ShimmerBlock className="h-4 w-16" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <ShimmerBlock key={i} className="h-8 w-8 !rounded-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <ShimmerBlock className="h-4 w-24" />
            <ShimmerBlock className="h-9 w-36 !rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-ink-900/8 dark:border-cream/10">
                <ShimmerBlock className="aspect-[3/4] w-full !rounded-none" />
                <div className="space-y-2 px-4 pb-4 pt-3">
                  <ShimmerBlock className="h-2.5 w-1/3" />
                  <div className="flex items-start justify-between gap-2">
                    <ShimmerBlock className="h-3.5 w-2/3" />
                    <ShimmerBlock className="h-3.5 w-10 shrink-0" />
                  </div>
                  <ShimmerBlock className="h-2.5 w-1/4" />
                  <ShimmerBlock className="mt-1.5 h-7 w-full !rounded-lg sm:h-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
