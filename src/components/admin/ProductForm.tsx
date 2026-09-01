'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@apollo/client';
import { UploadCloud } from 'lucide-react';
import { GET_CATEGORIES, GET_BRANDS, GET_STORES } from '@/lib/graphql/queries';
import { uploadProductImage } from '@/lib/utils/uploadProductImage';
import { PRESET_COLORS as COLOR_PRESETS } from '@/lib/utils/colorSwatch';
import type { Dictionary } from '@/i18n/get-dictionary';

export interface VariantValue {
  size: string;
  color: string;
  stock: number;
}

export interface ColorImagesValue {
  color: string;
  images: string[];
}

export interface ProductFormValues {
  title: string;
  titleRu?: string;
  description?: string;
  descriptionRu?: string;
  sku: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  stock: number;
  sizes: string[];
  colors: string[];
  images: string[];
  colorImages: ColorImagesValue[];
  variants: VariantValue[];
  categoryId: string;
  brandId?: string;
  storeId?: string;
  isFeatured?: boolean;
}

const CLOTHING_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SHOE_SIZE_OPTIONS = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

// Matches the shop-side ShopFilters.tsx detection: no explicit "is this
// footwear" flag on Category, so we recognize it from name/nameRu/slug
// instead — a shoe product needs numeric sizes (36-45), not XS-XXL.
function isFootwearCategory(cat?: { name?: string; nameRu?: string; slug?: string }): boolean {
  if (!cat) return false;
  const haystack = `${cat.name ?? ''} ${cat.nameRu ?? ''} ${cat.slug ?? ''}`.toLowerCase();
  // Covers however the admin might have named a footwear category, in
  // either language: "Krossovka"/"кроссовки" (sneakers), "poyabzal"/"обувь"
  // (footwear, generic), "tufli"/"туфли" (shoes), "botinka"/"ботинки"
  // (boots), "sandal"/"сандалии", "sapog"/"сапоги".
  return /shoe|poyabzal|обув|krossov|кроссов|tufli|туфли|botin|ботин|sneaker|sandal|сандал|sapog|сапог/.test(haystack);
}

// COLOR_PRESETS (the common ready-made swatches so the admin can add a
// color in one click instead of typing it every time — a custom text field
// below still covers anything not in this list) is now imported as
// PRESET_COLORS from lib/utils/colorSwatch.ts, aliased above, so this list
// can never drift out of sync with what the shop filter sidebar / quick-buy
// modal / product page color picker show for the same color name.

function Required() {
  return <span className="text-red-500"> *</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-500">{message}</p>;
}

export function ProductForm({
  dict,
  defaultValues,
  onSubmit,
  submitting,
}: {
  dict: Dictionary;
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  submitting?: boolean;
}) {
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const { data: brandsData } = useQuery(GET_BRANDS);
  const { data: storesData } = useQuery(GET_STORES);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({
    mode: 'onBlur',
    defaultValues: {
      sizes: [],
      colors: [],
      images: [],
      colorImages: [],
      variants: [],
      stock: 0,
      price: 0,
      ...defaultValues,
    },
  });

  const [imageInput, setImageInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingColorFor, setUploadingColorFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sizes = watch('sizes') ?? [];
  const colors = watch('colors') ?? [];
  const images = watch('images') ?? [];
  const colorImages = watch('colorImages') ?? [];
  const variants = watch('variants') ?? [];
  const hasVariantGrid = sizes.length > 0 || colors.length > 0;

  // Keep the variants array (per size+color stock) in sync whenever the
  // admin adds/removes a size or color — existing combos keep whatever the
  // admin already typed, and combos for a size/color that was just removed
  // are dropped.
  //
  // Brand-new combos (the very first time sizes/colors are turned on for a
  // product that had none before) default to the product's existing plain
  // `stock` number split across every combo, NOT 0 — defaulting to 0 would
  // silently zero out a product's entire inventory the moment an admin
  // enables sizes/colors without realizing they now also need to fill in
  // the grid, instantly making it unbuyable with no visible warning.
  // Combos added later (after the grid already exists) still start at 0,
  // since at that point there's no other stock number to infer from.
  useEffect(() => {
    if (!hasVariantGrid) return;
    const rows = sizes.length ? sizes : [''];
    const cols = colors.length ? colors : [''];
    // Judge "first population" by whether any real stock has been captured
    // yet, not by array length — a stale placeholder row (e.g. a leftover
    // { size: '', color: '', stock: 0 } from before sizes/colors were set)
    // has length 1 but carries no real data, and must still trigger the
    // fallback below instead of silently defaulting every combo to 0.
    const isFirstPopulation = variants.every((v) => !v.stock);
    const fallbackStock = isFirstPopulation ? Math.max(0, Number(getValues('stock')) || 0) : 0;
    const comboCount = rows.length * cols.length;
    const perComboFallback = isFirstPopulation && comboCount > 0 ? Math.ceil(fallbackStock / comboCount) : 0;

    const next: VariantValue[] = [];
    for (const s of rows) {
      for (const c of cols) {
        const existing = variants.find((v) => v.size === s && v.color === c);
        next.push({ size: s, color: c, stock: existing?.stock ?? perComboFallback });
      }
    }
    const changed =
      next.length !== variants.length ||
      next.some((v, i) => v.size !== variants[i]?.size || v.color !== variants[i]?.color);
    if (changed) setValue('variants', next, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join(','), colors.join(',')]);

  function getVariantStock(size: string, color: string): number {
    return variants.find((v) => v.size === size && v.color === color)?.stock ?? 0;
  }

  function setVariantStock(size: string, color: string, stock: number) {
    const next = variants.map((v) => (v.size === size && v.color === color ? { ...v, stock } : v));
    setValue('variants', next, { shouldDirty: true });
  }

  const totalVariantStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const categories = categoriesData?.categories ?? [];
  const noCategories = categories.length === 0;
  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
  const SIZE_OPTIONS = isFootwearCategory(selectedCategory) ? SHOE_SIZE_OPTIONS : CLOTHING_SIZE_OPTIONS;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setValue('images', [...images, url]);
    } catch {
      // eslint-disable-next-line no-alert
      alert(dict.admin.uploadError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleSize(size: string) {
    setValue('sizes', sizes.includes(size) ? sizes.filter((s) => s !== size) : [...sizes, size], {
      shouldDirty: true,
    });
  }

  // Dropping a color also drops any dedicated photos saved for it — an
  // orphaned colorImages entry for a color no longer offered would just be
  // dead data the admin can never see or manage again.
  function removeColorEntirely(name: string) {
    setValue('colors', colors.filter((c) => c !== name), { shouldDirty: true });
    setValue(
      'colorImages',
      (getValues('colorImages') ?? []).filter((ci) => ci.color !== name),
      { shouldDirty: true },
    );
  }

  function toggleColorPreset(name: string) {
    if (colors.includes(name)) {
      removeColorEntirely(name);
    } else {
      setValue('colors', [...colors, name], { shouldDirty: true });
    }
  }

  function addCustomColor() {
    const value = colorInput.trim();
    if (value && !colors.includes(value)) {
      setValue('colors', [...colors, value], { shouldDirty: true });
      setColorInput('');
    }
  }

  function addImage() {
    if (imageInput.trim()) {
      setValue('images', [...images, imageInput.trim()], { shouldDirty: true });
      setImageInput('');
    }
  }

  function getColorImages(color: string): string[] {
    return colorImages.find((ci) => ci.color === color)?.images ?? [];
  }

  // Reads/writes via getValues/setValue (not the `colorImages` watched
  // closure) so a sequence of awaited uploads for the same color — see
  // handleColorFileUpload's loop below — each see the previous one's result
  // instead of racing and dropping all but the last.
  function addColorImage(color: string, url: string) {
    const current = getValues('colorImages') ?? [];
    const idx = current.findIndex((ci) => ci.color === color);
    const next =
      idx >= 0
        ? current.map((ci, i) => (i === idx ? { ...ci, images: [...ci.images, url] } : ci))
        : [...current, { color, images: [url] }];
    setValue('colorImages', next, { shouldDirty: true });
  }

  function removeColorImage(color: string, index: number) {
    const current = getValues('colorImages') ?? [];
    const next = current.map((ci) =>
      ci.color === color ? { ...ci, images: ci.images.filter((_, i) => i !== index) } : ci,
    );
    setValue('colorImages', next, { shouldDirty: true });
  }

  // Accepts multiple files at once (input has `multiple`) and uploads them
  // one at a time to the same single-file endpoint the general images
  // uploader uses — lets the admin add 2, 3, 4, 5+ photos for a color in one
  // file-picker interaction instead of repeating the flow per photo.
  async function handleColorFileUpload(color: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingColorFor(color);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadProductImage(file);
        addColorImage(color, url);
      }
    } catch {
      // eslint-disable-next-line no-alert
      alert(dict.admin.uploadError);
    } finally {
      setUploadingColorFor(null);
      e.target.value = '';
    }
  }

  function submitHandler(values: ProductFormValues) {
    // Convert the "no brand selected" option (empty string) to undefined —
    // an empty string is not a valid UUID and would be rejected by the
    // backend even though the field is optional.
    onSubmit({
      ...values,
      brandId: values.brandId || undefined,
      storeId: values.storeId || undefined,
      oldPrice: values.oldPrice || undefined,
      discountPercent: values.discountPercent || undefined,
      // Drop colors that ended up with no photos actually uploaded (e.g. the
      // admin opened the file picker and cancelled) instead of saving empty
      // entries.
      colorImages: (values.colorImages ?? []).filter((ci) => ci.images.length > 0),
      // Only send per-variant stock when the product actually has size/color
      // options — otherwise keep the plain "stock" number the admin typed.
      // (An empty array, not undefined: ProductFormValues.variants isn't
      // optional, and the backend already treats an empty/missing variants
      // list the same way — falls back to the plain `stock` number.)
      variants: hasVariantGrid ? values.variants : [],
      stock: hasVariantGrid ? totalVariantStock : values.stock,
    });
  }

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* ── Basic info ── */}
        <div className="card-surface space-y-4 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">{dict.admin.basicInfo}</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">
                {dict.admin.titleUzLabel}
                <Required />
              </label>
              <input
                {...register('title', {
                  required: dict.admin.titleRequired,
                  minLength: { value: 2, message: dict.admin.titleMinLength },
                })}
                className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
              <FieldError message={errors.title?.message} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.titleRuLabel}</label>
              <input
                {...register('titleRu')}
                className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
              <p className="mt-1 text-xs text-ink-900/40">{dict.admin.titleRuHint}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.descriptionUzLabel}</label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder={dict.admin.descriptionUzPlaceholder}
                className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.descriptionRuLabel}</label>
              <textarea
                {...register('descriptionRu')}
                rows={4}
                className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">
              {dict.admin.skuLabel}
              <Required />
            </label>
            <input
              {...register('sku', { required: dict.admin.skuRequired })}
              placeholder="TSH-001"
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <p className="mt-1 text-xs text-ink-900/40">{dict.admin.skuHint}</p>
            <FieldError message={errors.sku?.message} />
          </div>
        </div>

        {/* ── Rasmlar ── */}
        <div className="card-surface space-y-4 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">{dict.admin.images}</h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="product-image-upload"
          />
          <label
            htmlFor="product-image-upload"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-900/15 py-6 text-sm font-semibold text-ink-900/60 transition-colors hover:border-ink-950 hover:text-ink-950"
          >
            <UploadCloud size={18} />
            {uploading ? dict.admin.uploading : dict.admin.uploadFromComputer}
          </label>

          <div className="flex gap-2">
            <input
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder={dict.admin.imageUrlPlaceholder}
              className="flex-1 rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <button type="button" onClick={addImage} className="btn-outline !px-4">
              {dict.admin.addButton}
            </button>
          </div>

          {images.length === 0 ? (
            <p className="text-xs text-ink-900/40">{dict.admin.noImagesYet}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <span key={img + i} className="flex items-center gap-2 rounded-full bg-ink-900/5 px-3 py-1.5 text-xs">
                  <span className="max-w-[160px] truncate">{img}</span>
                  <button
                    type="button"
                    onClick={() => setValue('images', images.filter((_, idx) => idx !== i))}
                    className="text-ink-900/40 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── O'lcham va rang ── */}
        <div className="card-surface space-y-5 p-6">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900/50">
              {dict.product.size} — {dict.admin.sizesHint}
            </h3>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                    sizes.includes(size) ? 'border-ink-950 bg-ink-950 text-cream' : 'border-ink-900/15 hover:border-ink-950'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900/50">
              {dict.product.color} — {dict.admin.colorsHint}
            </h3>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color.name}
                  onClick={() => toggleColorPreset(color.name)}
                  title={color.name}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    style={{ backgroundColor: color.hex }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
                      colors.includes(color.name) ? 'border-gold-500 ring-2 ring-gold-500/40' : 'border-ink-900/10'
                    }`}
                  >
                    {colors.includes(color.name) && (
                      <span className="text-xs font-bold" style={{ color: color.hex === '#f7f5f2' ? '#111114' : '#f7f5f2' }}>
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-ink-900/50">{color.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder={dict.admin.customColorPlaceholder}
                className="flex-1 rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomColor();
                  }
                }}
              />
              <button type="button" onClick={addCustomColor} className="btn-outline !px-4">
                {dict.admin.addButton}
              </button>
            </div>

            {colors.filter((c) => !COLOR_PRESETS.some((p) => p.name === c)).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {colors
                  .filter((c) => !COLOR_PRESETS.some((p) => p.name === c))
                  .map((c, i) => (
                    <span key={c + i} className="flex items-center gap-2 rounded-full bg-ink-900/5 px-3 py-1.5 text-xs">
                      {c}
                      <button
                        type="button"
                        onClick={() => removeColorEntirely(c)}
                        className="text-ink-900/40 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {/* ── Rang bo'yicha rasmlar ── */}
            {colors.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-ink-900/10 pt-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">
                    {dict.admin.colorImagesTitle}
                  </h3>
                  <p className="mt-1 text-xs text-ink-900/40">{dict.admin.colorImagesHint}</p>
                </div>

                {colors.map((c) => {
                  const preset = COLOR_PRESETS.find((p) => p.name === c);
                  const imgs = getColorImages(c);
                  return (
                    <div key={c} className="rounded-xl border border-ink-900/10 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        {preset && (
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-ink-900/10"
                            style={{ backgroundColor: preset.hex }}
                          />
                        )}
                        <span className="text-sm font-semibold">{c}</span>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleColorFileUpload(c, e)}
                        className="hidden"
                        id={`color-image-upload-${c}`}
                      />
                      <label
                        htmlFor={`color-image-upload-${c}`}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-900/15 py-4 text-xs font-semibold text-ink-900/60 transition-colors hover:border-ink-950 hover:text-ink-950"
                      >
                        <UploadCloud size={16} />
                        {uploadingColorFor === c ? dict.admin.uploading : dict.admin.uploadFromComputer}
                      </label>

                      {imgs.length === 0 ? (
                        <p className="mt-2 text-xs text-ink-900/40">{dict.admin.noColorImagesYet}</p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {imgs.map((img, i) => (
                            <div
                              key={img + i}
                              className="relative h-16 w-16 overflow-hidden rounded-lg border border-ink-900/10"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- admin
                                  thumbnail grid, arbitrary count/URLs, no need for next/image here */}
                              <img src={img} alt={`${c} ${i + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeColorImage(c, i)}
                                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-950/70 text-[10px] text-white hover:bg-red-500"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Zaxira: o'lcham/rangga ko'ra ── */}
        {hasVariantGrid && (
          <div className="card-surface space-y-3 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">{dict.admin.variantStockTitle}</h3>
            <p className="text-xs text-ink-900/50">{dict.admin.variantStockHint}</p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-ink-900/40">
                      {sizes.length > 0 && colors.length > 0 ? `${dict.product.size} / ${dict.product.color}` : ''}
                    </th>
                    {(colors.length ? colors : [dict.admin.stock]).map((c) => (
                      <th key={c} className="px-2 py-2 text-center text-xs font-semibold text-ink-900/60">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sizes.length ? sizes : [dict.admin.stock]).map((s) => (
                    <tr key={s}>
                      <td className="px-2 py-1.5 text-xs font-semibold text-ink-900/60">{sizes.length ? s : ''}</td>
                      {(colors.length ? colors : ['']).map((c) => {
                        const rowKey = sizes.length ? s : '';
                        const colKey = colors.length ? c : '';
                        return (
                          <td key={c} className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={getVariantStock(rowKey, colKey)}
                              onChange={(e) => setVariantStock(rowKey, colKey, Math.max(0, Number(e.target.value) || 0))}
                              className="w-20 rounded-lg border border-ink-900/15 px-2 py-1.5 text-center text-sm outline-none focus:border-ink-950"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-ink-900/50">
              {dict.admin.stock}: <span className="font-semibold text-ink-900">{totalVariantStock}</span>
            </p>

            {totalVariantStock === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                {dict.admin.variantStockZeroWarning}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* ── Pricing & stock ── */}
        <div className="card-surface space-y-4 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">{dict.admin.pricingSection}</h3>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">
              {dict.admin.price}
              <Required />
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              {...register('price', {
                required: dict.admin.priceRequired,
                valueAsNumber: true,
                min: { value: 0, message: dict.admin.priceMin },
              })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <FieldError message={errors.price?.message} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.oldPrice}</label>
            <input
              type="number"
              step="0.01"
              min={0}
              {...register('oldPrice', { valueAsNumber: true })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <p className="mt-1 text-xs text-ink-900/40">{dict.admin.discountHint}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.discount}</label>
            <input
              type="number"
              min={0}
              max={100}
              {...register('discountPercent', { valueAsNumber: true })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <p className="mt-1 text-xs text-ink-900/40">{dict.admin.optionalField}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">
              {dict.admin.stock}
              {!hasVariantGrid && <Required />}
            </label>
            {hasVariantGrid ? (
              <div className="w-full rounded-xl border border-ink-900/10 bg-ink-900/5 px-4 py-3 text-sm text-ink-900/60">
                {totalVariantStock} — {dict.admin.variantStockAutoHint}
              </div>
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  {...register('stock', {
                    required: dict.admin.stockRequired,
                    valueAsNumber: true,
                    min: { value: 0, message: dict.admin.stockMin },
                  })}
                  className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                />
                <FieldError message={errors.stock?.message} />
              </>
            )}
          </div>
        </div>

        {/* ── Category & brand ── */}
        <div className="card-surface space-y-4 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900/50">{dict.admin.categoryBrandSection}</h3>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">
              {dict.product.category}
              <Required />
            </label>
            <select
              {...register('categoryId', { required: dict.admin.categoryRequired })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            >
              <option value="">{dict.admin.selectPlaceholder}</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {noCategories && <p className="mt-1 text-xs font-medium text-amber-600">{dict.admin.noCategoriesYet}</p>}
            <FieldError message={errors.categoryId?.message} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.product.brand}</label>
            <select
              {...register('brandId')}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            >
              <option value="">{dict.admin.noneOption}</option>
              {brandsData?.brands?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-900/40">{dict.admin.optionalField}</p>
          </div>

          {/* Magazin (tashqi do'kon) — faqat admin ko'radi, saytda chiqmaydi */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.admin.storeLabel}</label>
            <select
              {...register('storeId')}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            >
              <option value="">{dict.admin.noneOption}</option>
              {storesData?.stores?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-900/40">{dict.admin.storeHint}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isFeatured')} className="accent-ink-950" />
            {dict.admin.featuredLabel}
          </label>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
          {submitting ? dict.admin.saving : dict.admin.save}
        </button>
      </div>
    </form>
  );
}
