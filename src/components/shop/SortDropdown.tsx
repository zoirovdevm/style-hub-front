'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useShopLoadingStore } from '@/lib/store/shop-loading-store';
import type { Dictionary } from '@/i18n/get-dictionary';

export function SortDropdown({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') ?? 'NEWEST';

  const options = [
    { value: 'NEWEST', label: dict.product.sortNewest },
    { value: 'PRICE_ASC', label: dict.product.sortPriceAsc },
    { value: 'PRICE_DESC', label: dict.product.sortPriceDesc },
    { value: 'MOST_POPULAR', label: dict.product.sortPopular },
    { value: 'TOP_RATED', label: dict.product.sortTopRated },
  ];

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    // Same reasoning as ShopFilters/Pagination: a <select onChange>, not
    // an <a> — RouteProgressBar's click listener never fires for this.
    useShopLoadingStore.getState().start();
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-full border border-ink-900/15 bg-white px-4 py-2 text-xs font-semibold text-ink-950 outline-none focus:border-ink-950 dark:border-cream/15 dark:bg-ink-800 dark:text-cream"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
