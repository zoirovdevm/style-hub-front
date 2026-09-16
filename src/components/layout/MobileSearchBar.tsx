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
    <div className="container-app pb-1 pt-3 lg:hidden">
      <div className="flex items-center gap-2">
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
            className="h-11 w-full rounded-full border border-ink-900/10 bg-white pl-10 pr-4 text-sm text-ink-950 outline-none transition-colors placeholder:text-ink-900/40 focus:border-gold-500 dark:border-cream/12 dark:bg-ink-900/70 dark:text-cream dark:placeholder:text-cream/40 dark:focus:border-gold-400"
          />
        </form>

        <Link
          href={`/${locale}/wishlist`}
          prefetch={false}
          aria-label={dict.nav.wishlist}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-900/10 bg-white text-ink-900 transition-colors active:bg-ink-900/5 dark:border-cream/12 dark:bg-ink-900/70 dark:text-cream"
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
