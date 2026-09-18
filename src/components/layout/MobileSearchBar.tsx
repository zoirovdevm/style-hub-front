'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Search } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { GET_MY_WISHLIST } from '@/lib/graphql/queries';
import { useAuthStore } from '@/lib/store/auth-store';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

interface MobileSearchBarProps {
  locale: Locale;
  dict: Dictionary;
}

// Header ostidagi qidiruv qatori — FAQAT kichik ekranlar uchun
// (`lg:hidden`). Uzum Market'dagi kabi: chapda keng qidiruv maydoni,
// o'ng chetida sevimlilar (yurakcha) tugmasi.
//
// JOYLASHUVI: bu komponent Header.tsx ICHIDA, suzib turuvchi (`fixed`)
// <header> tegining ikkinchi qatori sifatida chiziladi. Ilgari u
// layout.tsx da, <main> boshida turardi va sahifa bilan birga tepaga
// surilib ketardi; endi esa header bilan BIRGA joyida qotib turadi —
// xaridor qayerga scroll qilmasin, qidiruv va yurakcha doim ko'rinadi,
// hamma sahifada.
//
// Sahifa mazmuni uning ostidan boshlanishi uchun <main> ichiga xuddi
// shunday balandlikdagi bo'shliq qo'yiladi — pastdagi
// MobileSearchBarSpacer'ga qarang.
//
// Sevimlilar aynan shu yerga ko'chirildi va pastki navigatsiyadan olib
// tashlandi (MobileBottomNav.tsx ga qarang) — pastda uning o'rniga
// "Kategoriyalar" turadi.
//
// Qidiruv mavjud /shop sahifasining `search` parametriga yuboradi, ya'ni
// hech qanday yangi qidiruv mantig'i yozilmagan: filtrlar, saralash va
// sahifalash avvalgidek ishlayveradi.
export function MobileSearchBar({ locale, dict }: MobileSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const { data: wishlistData } = useQuery(GET_MY_WISHLIST, { skip: !user, fetchPolicy: 'cache-first' });
  const wishlistCount = wishlistData?.myWishlist?.length ?? 0;

  // Do'kon sahifasida turganda maydon URL'dagi joriy qidiruvni ko'rsatib
  // turadi (xaridor nima qidirganini unutmasligi uchun); boshqa
  // sahifalarda bo'sh bo'ladi.
  //
  // DIQQAT: bu yerda ataylab `useSearchParams()` ishlatilmadi. Bu komponent
  // layout.tsx orqali HAR BIR sahifada chiziladi, `useSearchParams` esa
  // butun sahifani dinamik render qilishga majburlaydi (build paytida
  // "should be wrapped in a suspense boundary" xatosi) — ya'ni statik
  // sahifalar (about, terms va h.k.) sekinlashardi. O'rniga qiymat
  // brauzerdagi manzildan o'qiladi: natija bir xil, lekin render
  // strategiyasiga tegmaydi.
  const [value, setValue] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('search') ?? '';
    setValue(q);
  }, [pathname]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/${locale}/shop?search=${encodeURIComponent(q)}` : `/${locale}/shop`);
  }

  // Admin panelda xaridorga mo'ljallangan qidiruv qatori keraksiz —
  // MobileBottomNav ham xuddi shunday qilib o'zini yashiradi.
  if (pathname?.startsWith(`/${locale}/admin`)) return null;

  return (
    // Header'ning o'zi kabi suzib turuvchi "tabletka" (pill): qidiruv va
    // yurakcha bitta oq/qora yuzada turadi. Bu shart — element endi
    // `fixed` header ichida bo'lgani uchun sahifa mazmuni uning ORTIDAN
    // surilib o'tadi; o'z foni bo'lmasa, harflar bir-birining ustiga
    // tushib o'qib bo'lmas holga kelardi.
    <div className="container-app mt-2 lg:hidden">
      <div className="transform-gpu flex items-center gap-2 rounded-full border border-black/10 bg-white px-2 py-2 shadow-lg dark:border-white/10 dark:bg-[rgba(10,10,12,0.92)] dark:backdrop-blur-[8px]">
        <form onSubmit={handleSubmit} className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-900/35 dark:text-cream/35"
          />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dict.nav.searchPlaceholder}
            aria-label={dict.nav.searchPlaceholder}
            // `w-full` + ota `min-w-0` — 320px kenglikdagi ekranda ham
            // maydon qisilib, yurakcha tugmasini tashqariga itarib
            // yubormaydi (gorizontal scroll chiqmasligi shundan).
            className="h-10 w-full rounded-full border border-ink-900/10 bg-ink-900/[0.04] pl-10 pr-4 text-sm text-ink-950 outline-none transition-colors placeholder:text-ink-900/40 focus:border-gold-500 dark:border-cream/12 dark:bg-cream/[0.06] dark:text-cream dark:placeholder:text-cream/40 dark:focus:border-gold-400"
          />
        </form>

        <Link
          href={`/${locale}/wishlist`}
          prefetch={false}
          aria-label={dict.nav.wishlist}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-900/10 bg-ink-900/[0.04] text-ink-900 transition-colors active:bg-ink-900/10 dark:border-cream/12 dark:bg-cream/[0.06] dark:text-cream"
        >
          <Heart size={19} />
          {wishlistCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-ink-950">
              {wishlistCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

// <main> ichidagi bo'shliq — yuqoridagi qatorning o'rnini egallaydi.
//
// NEGA ALOHIDA KOMPONENT: qidiruv qatori `fixed` header ichida, ya'ni
// hujjat oqimidan tashqarida — u o'zidan keyingi mazmunni pastga
// itarmaydi. Bo'shliqni layout.tsx dagi <main>'ning doimiy paddingiga
// qo'shib qo'yish esa noto'g'ri bo'lardi: admin panelda qidiruv qatori
// umuman chizilmaydi (pastdagi bir xil tekshiruv), shunda tepada
// sababsiz bo'sh joy qolib ketardi. Ikkalasi ham bitta qoidaga
// bo'ysungani uchun bo'shliq doim qatorning haqiqiy holatiga mos keladi.
//
// Balandligi: mt-2 (8px) + py-2 (16px) + h-10 (40px) = 64px = h-16.
export function MobileSearchBarSpacer({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname?.startsWith(`/${locale}/admin`)) return null;
  return <div aria-hidden="true" className="h-16 lg:hidden" />;
}
