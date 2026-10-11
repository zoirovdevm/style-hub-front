'use client';

import { useState } from 'react';
import { LogOut, Moon, Store, Sun, UserRound } from 'lucide-react';
import { useThemeStore } from '@/lib/store/theme-store';
import { omborApi, type OmborUser } from '@/lib/ombor/api';
import type { OmborDict, OmborLang } from '@/lib/ombor/i18n';
import { OmborDialog } from './OmborDialog';

// Profil: magazin nomi, Telegram xodimi, til, mavzu va chiqish.
// Magazinning maxfiy kodi bu yerda (va umuman frontendda) YO'Q — server
// uni hech qachon qaytarmaydi. Statistika/analitika yo'q (talab bo'yicha).
export function OmborProfile({
  storeName,
  user,
  lang,
  t,
  onLang,
  onLoggedOut,
}: {
  storeName: string;
  user: OmborUser;
  lang: OmborLang;
  t: OmborDict;
  onLang: (l: OmborLang) => void;
  onLoggedOut: () => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const employee = [user.firstName, user.username ? `@${user.username}` : null].filter(Boolean).join(' · ') || `ID ${user.id}`;

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await omborApi.logout();
    } catch {
      /* Token allaqachon yaroqsiz bo'lsa ham — baribir kirish sahifasiga. */
    } finally {
      setBusy(false);
      setConfirmOpen(false);
      onLoggedOut();
    }
  }

  const row = 'flex items-center gap-3 p-4';
  const label = 'text-xs font-medium text-ink-900/50 dark:text-cream/50';
  const value = 'truncate text-[15px] font-semibold text-ink-950 dark:text-cream';
  const segBtn = (active: boolean) =>
    `flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${
      active ? 'bg-gold-500 text-white' : 'text-ink-900/60 dark:text-cream/60'
    }`;

  return (
    <div className="space-y-4 pt-2">
      <div className="card-surface divide-y divide-[color:var(--surface-border)] overflow-hidden">
        <div className={row}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400">
            <Store size={19} />
          </span>
          <div className="min-w-0">
            <p className={label}>{t.store}</p>
            <p className={value}>{storeName}</p>
          </div>
        </div>
        <div className={row}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400">
            <UserRound size={19} />
          </span>
          <div className="min-w-0">
            <p className={label}>{t.employee}</p>
            <p className={value}>{employee}</p>
          </div>
        </div>
      </div>

      <div className="card-surface space-y-4 p-4">
        <div>
          <p className={`${label} mb-2`}>{t.language}</p>
          <div className="flex gap-1 rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-input)] p-1">
            <button type="button" onClick={() => onLang('uz')} className={segBtn(lang === 'uz')}>
              O‘zbekcha
            </button>
            <button type="button" onClick={() => onLang('ru')} className={segBtn(lang === 'ru')}>
              Русский
            </button>
          </div>
        </div>
        <div>
          <p className={`${label} mb-2`}>{t.theme}</p>
          <div className="flex gap-1 rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-input)] p-1">
            <button type="button" onClick={() => setTheme('light')} className={segBtn(theme === 'light')}>
              <Sun size={16} />
              {t.light}
            </button>
            <button type="button" onClick={() => setTheme('dark')} className={segBtn(theme === 'dark')}>
              <Moon size={16} />
              {t.dark}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 bg-red-600 text-[15px] font-bold text-white hover:bg-red-700"
      >
        <LogOut size={18} />
        {t.logout}
      </button>

      <OmborDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} dismissible={!busy}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <LogOut size={22} />
        </div>
        <p className="text-center text-[15px] font-semibold text-ink-950 dark:text-cream">{t.logoutConfirm}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={busy}
            className="h-12 border border-[color:var(--surface-border)] text-sm font-semibold text-ink-950 disabled:opacity-50 dark:text-cream"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="h-12 bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:bg-red-600/60"
          >
            {busy ? t.loading : t.logoutYes}
          </button>
        </div>
      </OmborDialog>
    </div>
  );
}
