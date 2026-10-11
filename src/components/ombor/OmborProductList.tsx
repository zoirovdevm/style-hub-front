'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { omborApi, type ProductListItem } from '@/lib/ombor/api';
import type { OmborDict, OmborLang } from '@/lib/ombor/i18n';
import { OmborProductGrid } from './OmborProductCard';

// Tovarlar ro'yxati + yopishqoq qidiruv. Bosh sahifa ham, tanlangan
// kategoriya ham shu komponentni ishlatadi (spetsifikatsiya: "Use the same
// product cards as Home").
//
// QIDIRUV: real vaqtda (200 ms kechikish bilan) — nom, SKU kodi va
// kategoriya nomi bo'yicha, serverda. Server faqat SHU magazinning
// tovarlarini qaytaradi.
//
// YOPISHQOQ QIDIRUV: header sahifa bilan birga tepaga chiqib ketadi,
// qidiruv qatori esa `sticky top-0` — ekran tepasida qoladi. Foni sahifa
// foni bilan bir xil, shuning uchun ostidan o'tayotgan kartalar ko'rinmaydi.
export function OmborProductList({
  lang,
  t,
  categoryId,
  refreshKey,
  onOpen,
  topSlot,
}: {
  lang: OmborLang;
  t: OmborDict;
  categoryId?: string;
  // O'zgarsa ro'yxat qayta yuklanadi (masalan tovar sahifasida ayirishdan
  // keyin qaytilganda — qoldiqlar yangilanishi uchun).
  refreshKey: number;
  onOpen: (id: string) => void;
  // Qidiruv ostida, ro'yxatdan oldin (masalan kategoriya sarlavhasi).
  topSlot?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<ProductListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setError(false);
    omborApi
      .products({ q: debounced || undefined, categoryId })
      .then((data) => {
        // Faqat ENG OXIRGI so'rov natijasi qo'llanadi — sekin kelgan eski
        // javob yangi qidiruv natijasini bosib ketmasligi uchun.
        if (seq === requestSeq.current) setItems(data);
      })
      .catch(() => {
        if (seq === requestSeq.current) setError(true);
      });
  }, [debounced, categoryId, refreshKey, attempt]);

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 bg-cream px-4 pb-3 pt-2 dark:bg-ink-950 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-input)] px-3.5 focus-within:border-gold-500">
          <Search size={17} className="shrink-0 text-ink-900/40 dark:text-cream/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchProducts}
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

      {topSlot}

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-900/60 dark:text-cream/60">{t.loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-outline !px-5 !py-2 text-xs">
            {t.retry}
          </button>
        </div>
      ) : items === null ? (
        // Skelet — yuklanish vaqtida to'r joyi band turadi (sakrash yo'q).
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card-surface overflow-hidden">
              <div className="skeleton-shimmer aspect-[3/4]" />
              <div className="space-y-2 p-3">
                <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-900/50 dark:text-cream/50">{t.noProducts}</p>
      ) : (
        <OmborProductGrid products={items} lang={lang} t={t} onOpen={onOpen} />
      )}
    </div>
  );
}
