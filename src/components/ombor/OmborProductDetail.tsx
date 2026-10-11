'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { swatchColor } from '@/lib/utils/colorSwatch';
import { translateColorName } from '@/lib/utils/colorNames';
import { OmborApiError, omborApi, type DeductResult, type ProductDetailData } from '@/lib/ombor/api';
import type { OmborDict, OmborLang } from '@/lib/ombor/i18n';
import { haptic } from '@/lib/ombor/telegram';
import { OmborDialog } from './OmborDialog';
import { StockBadge, productTitle } from './OmborProductCard';

// TOVAR SAHIFASI — ombordan olib tashlash shu yerda bajariladi.
//
// Oqim: rang → (bo'lsa) o'lcham → soni → QIZIL tugma → tasdiqlash oynasi →
// server atomar ayiradi → "olib tashlandi" oynasi (yashil belgi) → qoldiq
// yangilanadi.
//
// Ikki marta ayirilmasligi uchun uch qavat himoya:
//   1) tugma so'rov ketayotganda o'chiq;
//   2) har bir tasdiqlashga bitta `requestId` beriladi — tarmoq so'rovni
//      qayta yuborsa ham server uni takror deb taniydi;
//   3) serverdagi shartli UPDATE qoldiqni manfiyga tushirmaydi.
export function OmborProductDetail({
  productId,
  lang,
  t,
  onBack,
  onDeducted,
}: {
  productId: string;
  lang: OmborLang;
  t: OmborDict;
  onBack: () => void;
  // Ayirish muvaffaqiyatli bo'lgach — ro'yxatlardagi qoldiqlarni yangilash uchun.
  onDeducted: () => void;
}) {
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DeductResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setProduct(await omborApi.product(productId));
    } catch {
      setLoadError(true);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Variantlar tahlili ────────────────────────────────────────────
  const variants = product?.variants ?? [];
  const hasVariants = variants.length > 0;
  const colors = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) if (v.color) map.set(v.color, (map.get(v.color) ?? 0) + v.stock);
    return Array.from(map, ([name, stock]) => ({ name, stock }));
  }, [variants]);
  const hasColors = colors.length > 0;
  const hasSizes = variants.some((v) => v.size);

  const sizes = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of variants) {
      if (!v.size) continue;
      if (hasColors && v.color !== color) continue;
      map.set(v.size, (map.get(v.size) ?? 0) + v.stock);
    }
    return Array.from(map, ([name, stock]) => ({ name, stock }));
  }, [variants, hasColors, color]);

  // Birinchi yuklanishda (va qoldiq o'zgarganda) — mavjud bo'lgan birinchi
  // rang/o'lcham avtomatik tanlanadi; tanlangani tugab qolsa, almashtiriladi.
  useEffect(() => {
    if (!product || !hasColors) return;
    const current = colors.find((c) => c.name === color);
    if (!current || current.stock <= 0) {
      setColor((colors.find((c) => c.stock > 0) ?? colors[0]).name);
    }
  }, [product, colors, hasColors, color]);

  useEffect(() => {
    if (!product || !hasSizes) return;
    const current = sizes.find((s) => s.name === size);
    if (!current || current.stock <= 0) {
      const next = sizes.find((s) => s.stock > 0) ?? sizes[0];
      setSize(next ? next.name : null);
    }
  }, [product, sizes, hasSizes, size]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      variants.find(
        (v) => (hasColors ? v.color === color : !v.color) && (hasSizes ? v.size === size : !v.size),
      ) ?? null
    );
  }, [variants, hasVariants, hasColors, hasSizes, color, size]);

  const available = hasVariants ? selectedVariant?.stock ?? 0 : product?.stock ?? 0;
  const price = selectedVariant?.price ?? product?.price ?? 0;

  // Son har doim [1 .. mavjud] oralig'ida.
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, Math.max(available, 1))));
  }, [available]);

  // Rang tanlanganda — o'sha rangning rasmlari (bo'lsa).
  const images = useMemo(() => {
    if (!product) return [];
    const forColor = color ? product.colorImages.find((c) => c.color === color)?.images : undefined;
    return forColor && forColor.length ? forColor : product.images;
  }, [product, color]);
  useEffect(() => setImageIndex(0), [color]);

  // Barmoq bilan surib rasm almashtirish.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s || images.length < 2) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    setImageIndex((i) => Math.min(images.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
  };

  const variantLabel = [hasSizes ? size : null, hasColors && color ? translateColorName(color, lang) : null]
    .filter(Boolean)
    .join(' / ');
  const canRemove = available > 0 && (!hasVariants || !!selectedVariant) && !submitting;

  function openConfirm() {
    if (!canRemove) return;
    // Har bir tasdiqlash oynasiga BITTA identifikator. Oyna ichida
    // tugma necha marta bosilmasin, server uchun bu bitta amal.
    requestIdRef.current = crypto.randomUUID();
    setNotice(null);
    haptic('light');
    setConfirmOpen(true);
  }

  async function confirmRemove() {
    if (!product || submitting || !requestIdRef.current) return;
    setSubmitting(true);
    try {
      const result = await omborApi.deduct({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity: qty,
        requestId: requestIdRef.current,
      });
      haptic('success');
      setConfirmOpen(false);
      setSuccess(result);
      setQty(1);
      onDeducted();
      void load();
    } catch (e) {
      haptic('error');
      setConfirmOpen(false);
      const code = e instanceof OmborApiError ? e.code : '';
      setNotice(code === 'INSUFFICIENT_STOCK' ? t.insufficient : t.deductError);
      void load();
    } finally {
      setSubmitting(false);
      requestIdRef.current = null;
    }
  }

  // ── Holatlar ───────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-900/60 dark:text-cream/60">{t.loadError}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="btn-outline !px-5 !py-2 text-xs">
            {t.back}
          </button>
          <button type="button" onClick={() => void load()} className="btn-primary !px-5 !py-2 text-xs">
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4 pt-2">
        <div className="skeleton-shimmer aspect-[4/5] w-full rounded-3xl" />
        <div className="skeleton-shimmer h-5 w-3/4 rounded" />
        <div className="skeleton-shimmer h-5 w-1/3 rounded" />
      </div>
    );
  }

  const title = productTitle(product, lang);
  const chip =
    'flex items-center gap-2 border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const chipIdle =
    'border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] text-ink-900 dark:text-cream';
  const chipActive = 'border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400';

  return (
    <div className="pb-[calc(96px+env(safe-area-inset-bottom))]">
      {/* Orqaga */}
      <button
        type="button"
        onClick={onBack}
        className="mb-3 mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900/70 dark:text-cream/70"
      >
        <ArrowLeft size={18} />
        {t.back}
      </button>

      {/* Rasm(lar) */}
      <div
        className="relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-3xl bg-ink-900/5 dark:bg-cream/5"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images[imageIndex] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[imageIndex]} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-900/20 dark:text-cream/20">
            <Package size={56} />
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'w-5 bg-gold-500' : 'w-1.5 bg-white/70'}`}
              />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <div
              key={src + i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                i === imageIndex ? 'border-gold-500' : 'border-transparent'
              }`}
            >
              <button type="button" onClick={() => setImageIndex(i)} className="block h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Nomi, narxi, qoldig'i */}
      <div className="mt-5 space-y-2">
        <h1 className="text-xl font-bold leading-tight text-ink-950 dark:text-cream">{title}</h1>
        <p className="text-xs text-ink-900/45 dark:text-cream/45">SKU: {product.sku}</p>
        <p className="text-2xl font-bold text-gold-600 dark:text-gold-400">{formatPrice(price, lang)}</p>
        <div>
          <StockBadge stock={hasVariants ? (selectedVariant ? selectedVariant.stock : product.stock) : product.stock} t={t} />
        </div>
      </div>

      {/* Rang */}
      {hasColors && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">
            {t.color}
            {color ? `: ${translateColorName(color, lang)}` : ''}
          </h2>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                disabled={c.stock <= 0}
                onClick={() => setColor(c.name)}
                className={`${chip} ${color === c.name ? chipActive : chipIdle}`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: swatchColor(c.name) }}
                />
                {translateColorName(c.name, lang)}
                <span className="text-xs font-medium opacity-60">({c.stock})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* O'lcham */}
      {hasSizes && sizes.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{t.size}</h2>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s.name}
                type="button"
                disabled={s.stock <= 0}
                onClick={() => setSize(s.name)}
                className={`${chip} min-w-[56px] justify-center ${size === s.name ? chipActive : chipIdle}`}
              >
                {s.name}
                <span className="text-xs font-medium opacity-60">({s.stock})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Soni */}
      <section className="mt-5">
        <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">{t.quantity}</h2>
        <div className="inline-flex items-center gap-1 rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] p-1">
          <button
            type="button"
            aria-label="−"
            disabled={qty <= 1 || available <= 0}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-950 disabled:opacity-30 dark:text-cream"
          >
            <Minus size={18} />
          </button>
          <span className="min-w-[48px] text-center text-lg font-bold tabular-nums text-ink-950 dark:text-cream">
            {available > 0 ? qty : 0}
          </span>
          <button
            type="button"
            aria-label="+"
            disabled={qty >= available}
            onClick={() => setQty((q) => Math.min(available, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-950 disabled:opacity-30 dark:text-cream"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      {notice && (
        <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-amber-500/10 p-3 text-sm font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      )}

      {/* Pastda qotgan amal paneli — QIZIL tugma doim qo'l ostida. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--surface-border)] bg-[color:var(--surface-header)] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-lg">
          {hasVariants && !selectedVariant && (
            <p className="mb-2 text-center text-xs text-ink-900/50 dark:text-cream/50">{t.chooseVariant}</p>
          )}
          <button
            type="button"
            onClick={openConfirm}
            disabled={!canRemove}
            className="flex h-12 w-full items-center justify-center gap-2 bg-red-600 text-[15px] font-bold text-white transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-600/40"
          >
            <Trash2 size={18} />
            {t.removeButton}
          </button>
        </div>
      </div>

      {/* Tasdiqlash */}
      <OmborDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} dismissible={!submitting}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <Trash2 size={22} />
        </div>
        <h3 className="text-center text-lg font-bold text-ink-950 dark:text-cream">{t.confirmTitle}</h3>
        <div className="mt-4 space-y-1.5 rounded-[10px] bg-ink-900/5 p-3 text-sm dark:bg-cream/5">
          <p className="font-semibold text-ink-950 dark:text-cream">{title}</p>
          {variantLabel && <p className="text-ink-900/60 dark:text-cream/60">{variantLabel}</p>}
          <p className="text-ink-900/60 dark:text-cream/60">
            {t.quantity}: <span className="font-bold text-ink-950 dark:text-cream">{qty} {t.pcs}</span>
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            className="h-12 border border-[color:var(--surface-border)] text-sm font-semibold text-ink-950 disabled:opacity-50 dark:text-cream"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={confirmRemove}
            disabled={submitting}
            className="h-12 bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:bg-red-600/60"
          >
            {submitting ? t.removing : t.confirmYes}
          </button>
        </div>
      </OmborDialog>

      {/* Muvaffaqiyat — yashil belgi (tugmalar esa qizilligicha qoladi). */}
      <OmborDialog open={!!success} onClose={() => setSuccess(null)}>
        {success && (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check size={28} strokeWidth={3} />
            </div>
            <h3 className="text-center text-lg font-bold text-ink-950 dark:text-cream">{t.successTitle}</h3>
            <div className="mt-4 space-y-1.5 rounded-[10px] bg-ink-900/5 p-3 text-sm dark:bg-cream/5">
              <p className="font-semibold text-ink-950 dark:text-cream">{title}</p>
              {success.variantLabel && (
                <p className="text-ink-900/60 dark:text-cream/60">
                  {success.variantLabel
                    .split(' / ')
                    .map((part) => translateColorName(part, lang))
                    .join(' / ')}
                </p>
              )}
              <p className="text-ink-900/60 dark:text-cream/60">
                {t.deducted}: <span className="font-bold text-ink-950 dark:text-cream">{success.deducted} {t.pcs}</span>
              </p>
              <p className="text-ink-900/60 dark:text-cream/60">
                {t.remaining}:{' '}
                <span className="font-bold text-ink-950 dark:text-cream">
                  {success.remainingVariant ?? success.remainingProduct} {t.pcs}
                </span>
              </p>
            </div>
            <button type="button" onClick={() => setSuccess(null)} className="btn-primary mt-5 h-12 w-full">
              {t.done}
            </button>
          </>
        )}
      </OmborDialog>
    </div>
  );
}
