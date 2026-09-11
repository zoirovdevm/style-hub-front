import type { Metadata } from 'next';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

// Saytning yagona (canonical) manzili. .env dagi NEXT_PUBLIC_SITE_URL
// ustun turadi — layout.tsx dagi metadataBase ham xuddi shu qiymatni
// ishlatadi, shuning uchun bu yerda ham aynan o'sha manba o'qiladi va
// domen ikki joyda ikki xil bo'lib qolmaydi. Oxiridagi "/" olib
// tashlanadi, aks holda manzillar "//uz" ko'rinishida yig'ilib qolardi.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wardrobestore.uz').replace(/\/+$/, '');

export const SITE_NAME = 'Wardrobe';

// Sayt bo'ylab OG/Twitter uchun zaxira rasm. Hozircha logotip — keyinchalik
// public/ ichiga 1200x630 o'lchamli og-image.jpg qo'yilsa, shu yerdagi
// bitta qatorni o'zgartirish kifoya.
export const DEFAULT_OG_IMAGE = '/logo.svg';

// Google'ga "bu sahifaning har tildagi varianti qayerda" deb aytish uchun.
// x-default — tili mos kelmagan foydalanuvchi (masalan ingliz tilidagi
// brauzer) uchun ko'rsatiladigan variant; saytning asosiy tili o'zbekcha
// bo'lgani uchun o'sha beriladi.
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${SITE_URL}/${l}${path}`;
  languages['x-default'] = `${SITE_URL}/${defaultLocale}${path}`;
  return languages;
}

export function canonicalUrl(locale: Locale, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}

interface PageSeoInput {
  locale: Locale;
  /** Til prefiksisiz yo'l: '' (bosh sahifa), '/shop', '/product/oq-koylak' */
  path: string;
  title: string;
  description?: string;
  images?: string[];
  /** Mahsulot sahifalari uchun 'article' emas, OG turini aniq berish */
  ogType?: 'website' | 'article';
}

// Har bir public sahifa uchun bir xil, to'liq metadata to'plami:
// canonical + hreflang + Open Graph + Twitter. Bitta joyda turgani uchun
// keyinchalik biror narsa qo'shilsa (masalan yangi til), hamma sahifa
// birdek yangilanadi.
export function pageSeo({ locale, path, title, description, images, ogType = 'website' }: PageSeoInput): Metadata {
  const url = canonicalUrl(locale, path);
  const ogImages = (images && images.length > 0 ? images : [DEFAULT_OG_IMAGE]).map((src) =>
    src.startsWith('http') ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`,
  );

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: ogType,
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: ogImages,
      locale: locale === 'ru' ? 'ru_RU' : 'uz_UZ',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages,
    },
  };
}

// Qidiruv tizimlari indekslamasligi kerak bo'lgan sahifalar ro'yxati —
// tizimga kirish talab qiladigan, shaxsiy yoki admin bo'limlari. Bitta
// manba sifatida middleware.ts shu ro'yxatdan o'qiydi (X-Robots-Tag:
// noindex sarlavhasini qo'yadi) va sitemap.ts ham shu ro'yxatga tayanib
// bu sahifalarni xaritaga KIRITMAYDI. Til prefiksisiz yoziladi.
export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/cart',
  '/checkout',
  '/orders',
  '/profile',
  '/wishlist',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Yo'lni til prefiksidan tozalab (/uz/profile → /profile), yopiq
// sahifalar ro'yxatiga tushadimi — shuni tekshiradi.
export function isPrivatePath(pathname: string): boolean {
  let path = pathname;
  for (const l of locales) {
    if (path === `/${l}`) return false;
    if (path.startsWith(`/${l}/`)) {
      path = path.slice(l.length + 1);
      break;
    }
  }
  return PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
