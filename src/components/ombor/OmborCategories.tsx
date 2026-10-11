'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Search, X } from 'lucide-react';
import { omborApi, type CategoryItem } from '@/lib/ombor/api';
import type { OmborDict, OmborLang } from '@/lib/ombor/i18n';

export function categoryName(c: { name: string; nameRu: string | null }, lang: OmborLang) {
  return lang === 'ru' && c.nameRu ? c.nameRu : c.name;
}

// Kategoriyalar ro'yxati. Faqat SHU magazinda tovari bor kategoriyalar
// (server hisoblaydi), har birida tovarlar soni. Bittasi bosilganda
// OmborApp shu kategoriya tovarlarini (bosh sahifadagi kartalar bilan)
// ko'rsatadi.
export function OmborCategories({
  lang,
  t,
  refreshKey,
  onSelect,
}: {
  lang: OmborLang;
  t: OmborDict;
  refreshKey: number;
  onSelect: (c: CategoryItem) => void;
}) {
  const [items, setItems] = useState<CategoryItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    setError(false);
    omborApi
      .categories()
      .then((data) => alive && setItems(data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [refreshKey, attempt]);

  // Kategoriyalar soni kichik — qidiruv mijoz tomonida, darhol.
  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.name.toLowerCase().includes(q) || (c.nameRu ?? '').toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 bg-cream px-4 pb-3 pt-2 dark:bg-ink-950 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-input)] px-3.5 focus-within:border-gold-500">
          <Search size={17} className="shrink-0 text-ink-900/40 dark:text-cream/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCategories}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 !border-0 !bg-transparent text-ink-950 outline-none placeholder:text-ink-900/40 dark:text-cream dark:placeholder:text-cream/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="×"
              className="flex h-7 w-7 shrink-0 items-center justify-center text-ink-900/40 dark:text-cream/40"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-900/60 dark:text-cream/60">{t.loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-outline !px-5 !py-2 text-xs">
            {t.retry}
          </button>
        </div>
      ) : filtered === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-900/50 dark:text-cream/50">{t.noCategories}</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="card-surface overflow-hidden">
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400">
                  <Layers size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink-950 dark:text-cream">
                    {categoryName(c, lang)}
                  </span>
                  <span className="block text-xs text-ink-900/50 dark:text-cream/50">
                    {c.productCount} {t.productsCount}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-900/30 dark:text-cream/30" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
