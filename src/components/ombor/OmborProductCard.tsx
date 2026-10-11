'use client';

import { Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import type { ProductListItem } from '@/lib/ombor/api';
import { LOW_STOCK_THRESHOLD, type OmborDict, type OmborLang } from '@/lib/ombor/i18n';

// Qoldiq belgisi: bor / kam qoldi / tugagan. Tovar sahifasida ham
// ishlatiladi.
export function StockBadge({ stock, t }: { stock: number; t: OmborDict }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
        {t.outOfStock}
      </span>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        {t.lowStock}: {stock} {t.pcs}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      {t.inStock}: {stock} {t.pcs}
    </span>
  );
}

export function productTitle(p: { title: string; titleRu: string | null }, lang: OmborLang) {
  return lang === 'ru' && p.titleRu ? p.titleRu : p.title;
}

// Tovar kartochkasi. DIQQAT: tashqi o'ram — `div` (card-surface), ichida
// `button`. Sababi: globals.css hamma `button` ga 5px burchakni
// `!important` bilan qo'yadi — kartaning o'zi button bo'lsa, saytdagi
// kartalarning 16px burchagi yo'qolardi.
export function OmborProductCard({
  product,
  lang,
  t,
  onOpen,
}: {
  product: ProductListItem;
  lang: OmborLang;
  t: OmborDict;
  onOpen: () => void;
}) {
  const out = product.stock <= 0;
  return (
    <div className="card-surface overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[3/4] overflow-hidden bg-ink-900/5 dark:bg-cream/5">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt=""
              loading="lazy"
              className={`h-full w-full object-cover ${out ? 'opacity-50 grayscale' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-900/20 dark:text-cream/20">
              <Package size={36} />
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight text-ink-950 dark:text-cream">
            {productTitle(product, lang)}
          </p>
          <p className="text-[15px] font-bold text-gold-600 dark:text-gold-400">{formatPrice(product.price, lang)}</p>
          <StockBadge stock={product.stock} t={t} />
        </div>
      </button>
    </div>
  );
}

// Ikki ustunli (telefonda) to'r; kengroq ekranda ustunlar ko'payadi.
export function OmborProductGrid({
  products,
  lang,
  t,
  onOpen,
}: {
  products: ProductListItem[];
  lang: OmborLang;
  t: OmborDict;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <OmborProductCard key={p.id} product={p} lang={lang} t={t} onOpen={() => onOpen(p.id)} />
      ))}
    </div>
  );
}
