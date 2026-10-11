'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { OmborApiError, omborApi, type SessionResponse } from '@/lib/ombor/api';
import type { OmborDict, OmborLang } from '@/lib/ombor/i18n';
import { haptic } from '@/lib/ombor/telegram';
import { LangSwitch, ThemeToggle } from './OmborControls';

// Kirish sahifasi: faqat magazin kodi. Kod FAQAT serverda tekshiriladi;
// u hech qayerda saqlanmaydi (localStorage, URL, log) — muvaffaqiyatli
// kirishdan keyin Telegram akkaunti magazinga bog'lanadi va keyingi
// ochilishlarda kod qayta so'ralmaydi.
export function OmborLogin({
  initData,
  lang,
  t,
  onLang,
  onSuccess,
}: {
  initData: string;
  lang: OmborLang;
  t: OmborDict;
  onLang: (l: OmborLang) => void;
  onSuccess: (s: SessionResponse) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await omborApi.login(initData, value);
      haptic('success');
      setCode('');
      onSuccess(res);
    } catch (err) {
      haptic('error');
      const c = err instanceof OmborApiError ? err : null;
      if (c?.code === 'TOO_MANY_ATTEMPTS' || c?.status === 429) setError(t.tooManyAttempts);
      else if (c?.code === 'INVALID_CODE' || c?.code === 'VALIDATION') setError(t.invalidCode);
      else setError(t.sessionError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))]">
      <div className="flex justify-end gap-2">
        <LangSwitch lang={lang} onChange={onLang} />
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="text-center">
          <p className="brand-wordmark text-3xl font-semibold tracking-[0.18em] text-ink-950 dark:text-cream">WARDROBE</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">Ombor</p>
        </div>

        <div className="card-surface mt-8 p-5">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
            <KeyRound size={22} />
          </div>
          <h1 className="text-center text-xl font-bold text-ink-950 dark:text-cream">{t.loginTitle}</h1>
          <p className="mt-1.5 text-center text-sm text-ink-900/60 dark:text-cream/60">{t.loginDesc}</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.codePlaceholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={64}
              aria-invalid={!!error}
              className={`h-12 w-full rounded-[10px] border bg-[color:var(--surface-input)] px-4 text-center text-base font-semibold tracking-widest text-ink-950 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-900/40 focus:border-gold-500 dark:text-cream dark:placeholder:text-cream/40 ${
                error ? 'border-red-500' : 'border-[color:var(--surface-border)]'
              }`}
            />
            {error && <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={busy || !code.trim()} className="btn-primary h-12 w-full">
              {busy ? t.loading : t.loginButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
