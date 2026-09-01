'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { translateColorName } from '@/lib/utils/colorNames';
import { PRESET_COLORS } from '@/lib/utils/colorSwatch';
import type { Dictionary } from '@/i18n/get-dictionary';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

// The catalog has no explicit "this is a footwear category" flag, so we
// detect it from the category's name/nameRu/slug — works in both uz and ru
// regardless of exactly how the category was renamed via the admin panel.
function isFootwearCategory(cat?: { name: string; nameRu?: string; slug: string }): boolean {
  if (!cat) return false;
  const haystack = `${cat.name} ${cat.nameRu ?? ''} ${cat.slug}`.toLowerCase();
  // Covers however the admin might have named a footwear category, in
  // either language: "Krossovka"/"кроссовки" (sneakers), "poyabzal"/"обувь"
  // (footwear, generic), "tufli"/"туфли" (shoes), "botinka"/"ботинки"
  // (boots), "sandal"/"сандалии", "sapog"/"сапоги".
  return /shoe|poyabzal|обув|krossov|кроссов|tufli|туфли|botin|ботин|sneaker|sandal|сандал|sapog|сапог/.test(haystack);
}

interface ShopFiltersProps {
  dict: Dictionary;
  categories: { slug: string; name: string; nameRu?: string }[];
  locale: 'uz' | 'ru';
}

export function ShopFilters({ dict, categories, locale }: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  // Mobile-only accordion state: on phones the filter panel used to render
  // fully expanded and pushed the product grid way down below the fold.
  // Collapsed by default on mobile; the `lg:block` override below keeps it
  // always-open on desktop regardless of this flag.
  const [expanded, setExpanded] = useState(false);

  const activeCategory = searchParams.get('category');
  const activeSizes = searchParams.get('sizes')?.split(',').filter(Boolean) ?? [];
  const activeColors = searchParams.get('colors')?.split(',').filter(Boolean) ?? [];
  const activeCategoryObj = categories.find((c) => c.slug === activeCategory);
  const SIZES = isFootwearCategory(activeCategoryObj) ? SHOE_SIZES : CLOTHING_SIZES;

  function updateParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggleListParam(key: string, value: string, currentList: string[]) {
    updateParams((params) => {
      const next = currentList.includes(value) ? currentList.filter((v) => v !== value) : [...currentList, value];
      if (next.length) params.set(key, next.join(','));
      else params.delete(key);
    });
  }

  return (
    <aside className="w-full shrink-0 lg:w-64 lg:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 py-1 text-left lg:pointer-events-none lg:flex-none"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-950 dark:text-cream">{dict.product.filters}</h3>
          <ChevronDown size={18} className={`text-ink-900/50 transition-transform dark:text-cream/50 lg:hidden ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => router.push(pathname)}
          className="text-xs font-semibold text-ink-900/50 transition-colors hover:text-red-500 dark:text-cream/50 dark:hover:text-red-400"
        >
          {dict.product.clearFilters}
        </button>
      </div>

      <div className={`${expanded ? 'mt-6 block' : 'hidden'} space-y-8 lg:mt-0 lg:block`}>
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => updateParams((p) => (search.trim() ? p.set('search', search.trim()) : p.delete('search')))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder={dict.product.searchPlaceholder}
          className="w-full rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none focus:border-ink-950 dark:border-cream/15 dark:bg-ink-800 dark:text-cream"
        />
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{dict.nav.categories}</h4>
        {/* Bold-text-only used to be the only signal for which category was
            active — easy to miss at a glance, especially scanning a list of
            5+ items. Active rows now also get a green-tinted background and
            left accent bar (the site's usual selected-state treatment), and
            every row — active or not — gets a hover background so the whole
            list reads as clickable, not just the ones that happen to be
            links. */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => updateParams((p) => p.delete('category'))}
            className={`rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-colors ${
              !activeCategory
                ? 'border-gold-500 bg-gold-500/10 font-bold text-gold-600 dark:text-gold-400'
                : 'border-transparent text-ink-900/60 hover:bg-ink-900/5 hover:text-ink-950 dark:text-cream/60 dark:hover:bg-cream/5 dark:hover:text-cream'
            }`}
          >
            {dict.product.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateParams((p) => p.set('category', cat.slug))}
              className={`rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                activeCategory === cat.slug
                  ? 'border-gold-500 bg-gold-500/10 font-bold text-gold-600 dark:text-gold-400'
                  : 'border-transparent text-ink-900/60 hover:bg-ink-900/5 hover:text-ink-950 dark:text-cream/60 dark:hover:bg-cream/5 dark:hover:text-cream'
              }`}
            >
              {locale === 'ru' && cat.nameRu ? cat.nameRu : cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{dict.product.size}</h4>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleListParam('sizes', size, activeSizes)}
              className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold transition-colors ${
                activeSizes.includes(size)
                  ? 'border-gold-500 bg-gold-500 text-white'
                  : 'border-ink-900/15 text-ink-900/70 hover:border-ink-950 hover:bg-ink-900/5 dark:border-cream/20 dark:text-cream dark:hover:border-cream dark:hover:bg-cream/5'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{dict.product.color}</h4>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.name}
              title={translateColorName(color.name, locale)}
              onClick={() => toggleListParam('colors', color.name, activeColors)}
              style={{ backgroundColor: color.hex }}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                activeColors.includes(color.name)
                  ? 'border-gold-500 ring-2 ring-gold-500/40'
                  : 'border-ink-900/10 dark:border-cream/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{dict.product.priceRange}</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => updateParams((p) => (minPrice ? p.set('minPrice', minPrice) : p.delete('minPrice')))}
            placeholder="0"
            className="w-full rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-950 outline-none focus:border-ink-950 dark:border-cream/15 dark:bg-ink-800 dark:text-cream dark:placeholder:text-cream/40"
          />
          <span className="text-ink-900/30 dark:text-cream/30">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => updateParams((p) => (maxPrice ? p.set('maxPrice', maxPrice) : p.delete('maxPrice')))}
            placeholder="1000000"
            className="w-full rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-950 outline-none focus:border-ink-950 dark:border-cream/15 dark:bg-ink-800 dark:text-cream dark:placeholder:text-cream/40"
          />
        </div>
      </div>
      </div>
    </aside>
  );
}
