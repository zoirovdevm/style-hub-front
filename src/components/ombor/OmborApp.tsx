'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Home, LayoutGrid, Loader2, Send, UserRound } from 'lucide-react';
import { useThemeStore } from '@/lib/store/theme-store';
import {
  omborApi,
  setSessionToken,
  setUnauthorizedHandler,
  type CategoryItem,
  type OmborUser,
  type SessionResponse,
} from '@/lib/ombor/api';
import { OMBOR_T, type OmborLang } from '@/lib/ombor/i18n';
import { getTelegram, haptic, type TelegramWebApp } from '@/lib/ombor/telegram';
import { LangSwitch, ThemeToggle } from './OmborControls';
import { OmborLogin } from './OmborLogin';
import { OmborProductList } from './OmborProductList';
import { OmborProductDetail } from './OmborProductDetail';
import { OmborCategories, categoryName } from './OmborCategories';
import { OmborProfile } from './OmborProfile';

// Wardrobe Ombor Mini App qobig'i.
//
// Holatlar: boot → (Telegram tashqarisi | xato | kirish | asosiy).
// Asosiy qismda: Bosh sahifa / Kategoriya / Profil tablari + tovar sahifasi
// (ichki sahifa). Sahifalar URL emas, holat orqali almashadi — Telegram
// "Orqaga" tugmasi ham shu holatni boshqaradi.
//
// Sessiya: har ochilishda Telegram imzolagan initData serverga yuboriladi.
// Bu Telegram akkaunti avval magazin kodi bilan kirgan bo'lsa — server
// darhol yangi token beradi (kod qayta so'ralmaydi). Token faqat xotirada.

const LANG_KEY = 'ombor:lang';
const THEME_KEY = 'fashion-marketplace-theme';
// Saytdagi fon ranglari (bg-cream / bg-ink-950) — Telegram'ning o'z
// sarlavha/fon paneli ham ilova bilan bir xil rangda bo'lishi uchun.
const TG_BG = { light: '#F8FAFC', dark: '#07111C' } as const;

type Phase = 'boot' | 'outside' | 'error' | 'login' | 'main';
type Tab = 'home' | 'categories' | 'profile';

function readStoredLang(): OmborLang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'uz' || v === 'ru' ? v : null;
  } catch {
    return null;
  }
}

// telegram-web-app.js `beforeInteractive` bilan yuklanadi, lekin juda sekin
// tarmoqda biroz kechikishi mumkin — qisqa kutish.
async function waitForTelegram(timeoutMs = 2000): Promise<TelegramWebApp | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const tg = getTelegram();
    if (tg) return tg;
    await new Promise((r) => setTimeout(r, 100));
  }
  return getTelegram();
}

export function OmborApp() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [lang, setLangState] = useState<OmborLang>('uz');
  const [initData, setInitData] = useState('');
  const [user, setUser] = useState<OmborUser | null>(null);
  const [storeName, setStoreName] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const savedScroll = useRef(0);
  const theme = useThemeStore((s) => s.theme);

  const t = OMBOR_T[lang];

  const setLang = useCallback((l: OmborLang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* saqlab bo'lmasa — faqat shu ochilish uchun */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Mavzu: saqlangan tanlov bo'lmasa, layout'dagi skript qo'ygan klass
  // (Telegram yoki tizim mavzusi) store'ga ko'chiriladi — tugmalar to'g'ri
  // holatni ko'rsatishi uchun.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      /* ignore */
    }
    const store = useThemeStore.getState();
    if (!stored) {
      const tg = getTelegram();
      const dark = document.documentElement.classList.contains('dark') || tg?.colorScheme === 'dark';
      store.setTheme(dark ? 'dark' : 'light');
    } else {
      store.setTheme(store.theme);
    }
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    try {
      tg?.setHeaderColor?.(TG_BG[theme]);
      tg?.setBackgroundColor?.(TG_BG[theme]);
    } catch {
      /* eski klient */
    }
  }, [theme]);

  const applySession = useCallback((s: SessionResponse) => {
    setUser(s.user);
    if (s.authenticated && s.token) {
      setSessionToken(s.token);
      setStoreName(s.store?.name ?? '');
      setTab('home');
      setCategory(null);
      setDetailId(null);
      setPhase('main');
    } else {
      setSessionToken(null);
      setPhase('login');
    }
  }, []);

  const toLogin = useCallback(() => {
    setSessionToken(null);
    setStoreName('');
    setDetailId(null);
    setCategory(null);
    setTab('home');
    setPhase('login');
  }, []);

  // Ishga tushish.
  useEffect(() => {
    let alive = true;
    setUnauthorizedHandler(toLogin);
    (async () => {
      const tg = await waitForTelegram();
      if (!alive) return;
      try {
        tg?.ready();
        tg?.expand();
        tg?.disableVerticalSwipes?.();
      } catch {
        /* ignore */
      }
      const stored = readStoredLang();
      const tgLang = tg?.initDataUnsafe?.user?.language_code;
      setLangState(stored ?? (tgLang?.startsWith('ru') ? 'ru' : 'uz'));

      const data = tg?.initData ?? '';
      if (!data) {
        setPhase('outside');
        return;
      }
      setInitData(data);
      try {
        const s = await omborApi.session(data);
        if (alive) applySession(s);
      } catch {
        if (alive) setPhase('error');
      }
    })();
    return () => {
      alive = false;
      setUnauthorizedHandler(null);
    };
  }, [applySession, toLogin]);

  // ── Navigatsiya ────────────────────────────────────────────────────
  const openProduct = useCallback((id: string) => {
    savedScroll.current = window.scrollY;
    haptic('light');
    setDetailId(id);
    window.scrollTo(0, 0);
  }, []);

  const closeProduct = useCallback(() => {
    setDetailId(null);
    const y = savedScroll.current;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);

  const goBack = useCallback(() => {
    if (detailId) closeProduct();
    else if (category) {
      setCategory(null);
      window.scrollTo(0, 0);
    }
  }, [detailId, category, closeProduct]);

  const selectTab = (next: Tab) => {
    haptic('light');
    setDetailId(null);
    if (next === tab) {
      if (next === 'categories') setCategory(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setTab(next);
    setCategory(null);
    window.scrollTo(0, 0);
  };

  // Telegram'ning tizim "Orqaga" tugmasi — ichki sahifalarda ko'rinadi.
  const backRef = useRef(goBack);
  backRef.current = goBack;
  const canGoBack = phase === 'main' && (!!detailId || !!category);
  useEffect(() => {
    const tg = getTelegram();
    if (!tg?.BackButton) return;
    const handler = () => backRef.current();
    try {
      if (canGoBack) {
        tg.BackButton.onClick(handler);
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
    } catch {
      /* ignore */
    }
    return () => {
      try {
        tg.BackButton.offClick(handler);
      } catch {
        /* ignore */
      }
    };
  }, [canGoBack]);

  // ── Holatlar ───────────────────────────────────────────────────────
  if (phase === 'boot') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-ink-900/40 dark:text-cream/40">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (phase === 'outside' || phase === 'error') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="brand-wordmark text-2xl font-semibold tracking-[0.18em] text-ink-950 dark:text-cream">WARDROBE</p>
        <p className="max-w-xs text-sm text-ink-900/60 dark:text-cream/60">
          {phase === 'outside' ? t.openInTelegram : t.sessionError}
        </p>
        {phase === 'outside' ? (
          <a href="https://t.me/WardrobeOmborBot" className="btn-primary">
            <Send size={16} />
            @WardrobeOmborBot
          </a>
        ) : (
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            {t.retry}
          </button>
        )}
      </div>
    );
  }

  if (phase === 'login') {
    return <OmborLogin initData={initData} lang={lang} t={t} onLang={setLang} onSuccess={applySession} />;
  }

  // ── Asosiy ilova ───────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: 'home', label: t.home, Icon: Home },
    { id: 'categories', label: t.categories, Icon: LayoutGrid },
    { id: 'profile', label: t.profile, Icon: UserRound },
  ];

  return (
    <div className="min-h-[100dvh]">
      <div
        className={`mx-auto w-full max-w-[1400px] px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-10 ${
          detailId ? '' : 'pb-[calc(76px+env(safe-area-inset-bottom))]'
        }`}
      >
        {/* Header — sahifa bilan birga tepaga chiqib ketadi (sticky EMAS);
            uning ostidagi qidiruv qatori esa yopishqoq. */}
        <header className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="brand-wordmark text-xl font-semibold leading-none tracking-[0.16em] text-ink-950 dark:text-cream">
              WARDROBE
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-900/50 dark:text-cream/50">
              <span className="text-gold-600 dark:text-gold-400">Ombor</span>
              {storeName ? ` · ${storeName}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LangSwitch lang={lang} onChange={setLang} />
            <ThemeToggle />
          </div>
        </header>

        {detailId && (
          <OmborProductDetail
            key={detailId}
            productId={detailId}
            lang={lang}
            t={t}
            onBack={closeProduct}
            onDeducted={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {/* Ro'yxatlar tovar sahifasi ochiq paytida ham o'chirilmaydi, faqat
            yashiriladi — qaytganda qidiruv matni va scroll joyi saqlanadi. */}
        <div className={detailId ? 'hidden' : ''}>
          {tab === 'home' && (
            <OmborProductList lang={lang} t={t} refreshKey={refreshKey} onOpen={openProduct} />
          )}

          {tab === 'categories' &&
            (category ? (
              <OmborProductList
                key={category.id}
                lang={lang}
                t={t}
                categoryId={category.id}
                refreshKey={refreshKey}
                onOpen={openProduct}
                topSlot={
                  <div className="mb-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBack}
                      aria-label={t.back}
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] text-ink-950 dark:text-cream"
                    >
                      <ArrowLeft size={17} />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink-950 dark:text-cream">
                        {categoryName(category, lang)}
                      </p>
                      <p className="text-xs text-ink-900/50 dark:text-cream/50">
                        {category.productCount} {t.productsCount}
                      </p>
                    </div>
                  </div>
                }
              />
            ) : (
              <OmborCategories
                lang={lang}
                t={t}
                refreshKey={refreshKey}
                onSelect={(c) => {
                  haptic('light');
                  setCategory(c);
                  window.scrollTo(0, 0);
                }}
              />
            ))}

          {tab === 'profile' && user && (
            <OmborProfile
              storeName={storeName}
              user={user}
              lang={lang}
              t={t}
              onLang={setLang}
              onLoggedOut={toLogin}
            />
          )}
        </div>
      </div>

      {/* Pastki menyu — doim ekran pastida (tovar sahifasida o'rniga
          "olib tashlash" paneli chiqadi). */}
      {!detailId && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--surface-border)] bg-[color:var(--surface-header)] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid h-16 max-w-lg grid-cols-3">
            {tabs.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTab(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    active ? 'text-gold-600 dark:text-gold-400' : 'text-ink-900/45 dark:text-cream/45'
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
