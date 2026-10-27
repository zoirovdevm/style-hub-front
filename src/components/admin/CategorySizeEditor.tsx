'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { SIZE_PRESETS, getAutoSizeOptions, type CategoryLike } from '@/lib/utils/categorySizes';

// Kategoriyaning o'lchamlar ro'yxatini sozlash (admin → Kategoriyalar).
//
// Uch rejim:
//   • Avtomatik   — nomiga qarab (kiyim XS–XXXL, poyabzal 35–45, shim,
//                   duxi ml…). Avvalgi xulq-atvor, saqlanadigan qiymat: null.
//   • O'z ro'yxati — admin aynan qaysi o'lchamlar chiqishini belgilaydi
//                   (masalan myach: 1–7, sport krossovka: 36–45).
//   • O'lchamsiz  — tovar qo'shishda o'lcham bo'limi umuman chiqmaydi: [].
//
// Shu ro'yxat ham tovar qo'shish formasida, ham do'kondagi filtrda
// ishlatiladi (lib/utils/categorySizes.ts → getSizeOptions).

type Mode = 'auto' | 'custom' | 'none';

const TEXT = {
  uz: {
    auto: 'Avtomatik',
    custom: "O'z ro'yxatim",
    none: "O'lchamsiz",
    autoHint: "Kategoriya nomiga qarab tanlanadi. Hozir chiqadigan o'lchamlar:",
    autoEmpty: "o'lcham chiqmaydi",
    noneHint: "Bu kategoriyadagi tovarlarga o'lcham so'ralmaydi.",
    presets: 'Tayyor to‘plamlar',
    range: 'Raqamlar oralig‘i',
    from: 'dan',
    to: 'gacha',
    addRange: "Qo'shish",
    add: "Qo'shish",
    addPlaceholder: "O'lcham (masalan 5 yoki 38, 39, 40)",
    emptyList: "Ro'yxat bo'sh — yuqoridan to'plam tanlang yoki o'lcham qo'shing",
    clearAll: 'Hammasini tozalash',
    save: 'Saqlash',
    saving: 'Saqlanmoqda…',
    cancel: 'Bekor qilish',
    needOne: "Kamida bitta o'lcham qo'shing yoki «O'lchamsiz» ni tanlang",
  },
  ru: {
    auto: 'Автоматически',
    custom: 'Свой список',
    none: 'Без размеров',
    autoHint: 'Подбирается по названию категории. Сейчас будут размеры:',
    autoEmpty: 'размеров не будет',
    noneHint: 'Для товаров этой категории размер не запрашивается.',
    presets: 'Готовые наборы',
    range: 'Диапазон чисел',
    from: 'от',
    to: 'до',
    addRange: 'Добавить',
    add: 'Добавить',
    addPlaceholder: 'Размер (например 5 или 38, 39, 40)',
    emptyList: 'Список пуст — выберите набор выше или добавьте размер',
    clearAll: 'Очистить всё',
    save: 'Сохранить',
    saving: 'Сохранение…',
    cancel: 'Отмена',
    needOne: 'Добавьте хотя бы один размер или выберите «Без размеров»',
  },
} as const;

function modeOf(sizeOptions: string[] | null | undefined): Mode {
  if (!Array.isArray(sizeOptions)) return 'auto';
  return sizeOptions.length === 0 ? 'none' : 'custom';
}

// Takrorlarni (katta-kichik harfni farqlamay) olib tashlab, tartibni saqlab qo'shadi.
function mergeSizes(current: string[], incoming: string[]) {
  const seen = new Set(current.map((v) => v.toLowerCase()));
  const out = [...current];
  for (const raw of incoming) {
    const v = raw.trim();
    if (!v || v.length > 20 || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

export function CategorySizeEditor({
  category,
  locale,
  onSave,
  onCancel,
}: {
  category: CategoryLike;
  locale: 'uz' | 'ru';
  onSave: (sizeOptions: string[] | null) => Promise<void>;
  onCancel: () => void;
}) {
  const t = TEXT[locale];
  const [mode, setMode] = useState<Mode>(modeOf(category.sizeOptions));
  const [sizes, setSizes] = useState<string[]>(
    Array.isArray(category.sizeOptions) && category.sizeOptions.length > 0 ? category.sizeOptions : [],
  );
  const [input, setInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSizes = getAutoSizeOptions(category);

  function addInput() {
    // Vergul yoki bo'shliq bilan bir nechtasini birdan qo'shish mumkin:
    // "38, 39, 40" yoki "S M L".
    const parts = input.split(/[,;\s]+/).filter(Boolean);
    if (parts.length === 0) return;
    setSizes((s) => mergeSizes(s, parts));
    setInput('');
    setError(null);
  }

  function addRange() {
    const a = Number(from);
    const b = Number(to);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return;
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    if (hi - lo > 79) return; // juda katta oraliqdan himoya
    const list: string[] = [];
    for (let n = lo; n <= hi; n++) list.push(String(n));
    setSizes((s) => mergeSizes(s, list));
    setError(null);
  }

  async function save() {
    if (mode === 'custom' && sizes.length === 0) {
      setError(t.needOne);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(mode === 'auto' ? null : mode === 'none' ? [] : sizes);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'min-w-0 rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-950 outline-none focus:border-ink-950 dark:border-cream/15 dark:bg-ink-900 dark:text-cream dark:placeholder:text-cream/40 dark:focus:border-cream';
  const pill = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-ink-950 bg-ink-950 text-cream dark:border-cream dark:bg-cream dark:text-ink-950'
        : 'border-ink-900/15 hover:border-ink-950 dark:border-cream/15 dark:hover:border-cream'
    }`;

  return (
    <div className="space-y-3 rounded-xl border border-ink-900/10 p-3 dark:border-cream/10">
      {/* Rejim */}
      <div className="flex flex-wrap gap-1.5">
        {(['auto', 'custom', 'none'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); }} className={pill(mode === m)}>
            {t[m]}
          </button>
        ))}
      </div>

      {mode === 'auto' && (
        <p className="text-xs text-ink-900/55 dark:text-cream/55">
          {t.autoHint}{' '}
          <span className="font-semibold text-ink-950 dark:text-cream">
            {autoSizes.length ? autoSizes.join(', ') : t.autoEmpty}
          </span>
        </p>
      )}

      {mode === 'none' && <p className="text-xs text-ink-900/55 dark:text-cream/55">{t.noneHint}</p>}

      {mode === 'custom' && (
        <div className="space-y-3">
          {/* Tayyor to'plamlar */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-900/45 dark:text-cream/45">
              {t.presets}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => { setSizes(p.sizes); setError(null); }}
                  className={pill(false)}
                >
                  {locale === 'ru' ? p.ru : p.uz}
                </button>
              ))}
            </div>
          </div>

          {/* Raqamlar oralig'i: masalan 36 dan 45 gacha */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-900/45 dark:text-cream/45">
              {t.range}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <input
                type="number"
                inputMode="numeric"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="36"
                className={`${inputClass} w-20`}
              />
              <span>{t.from}</span>
              <input
                type="number"
                inputMode="numeric"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="45"
                className={`${inputClass} w-20`}
              />
              <span>{t.to}</span>
              <button type="button" onClick={addRange} className={pill(false)}>
                {t.addRange}
              </button>
            </div>
          </div>

          {/* Bittalab qo'shish */}
          <div className="flex gap-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInput();
                }
              }}
              placeholder={t.addPlaceholder}
              className={`${inputClass} flex-1`}
            />
            <button type="button" onClick={addInput} className={pill(false)}>
              {t.add}
            </button>
          </div>

          {/* Joriy ro'yxat */}
          {sizes.length === 0 ? (
            <p className="text-xs text-ink-900/45 dark:text-cream/45">{t.emptyList}</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold-500/10 py-1 pl-2.5 pr-1 text-xs font-semibold text-gold-600 dark:text-gold-400"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label="×"
                      onClick={() => setSizes((list) => list.filter((x) => x !== s))}
                      className="flex h-5 w-5 items-center justify-center opacity-60 hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSizes([])}
                className="text-xs font-semibold text-ink-900/45 underline-offset-2 hover:underline dark:text-cream/45"
              >
                {t.clearAll}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="btn-primary !px-4 !py-2 text-xs disabled:opacity-60">
          {saving ? t.saving : t.save}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline !px-4 !py-2 text-xs">
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
