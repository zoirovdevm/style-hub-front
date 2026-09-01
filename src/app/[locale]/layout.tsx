import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Explicit, in case an embedding webview (e.g. Telegram's in-app browser)
// ignores Next.js's implicit default and falls back to a desktop-width
// virtual viewport (~980-1024px) scaled down to fit the screen — that's
// what makes everything look tiny/cramped and can even make `lg:`-gated
// desktop-only elements (like the header's Login button) show up on a
// phone, since the browser genuinely believes it has 1024px of width.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const dict = await getDictionary(params.locale);
  return {
    // Ijtimoiy tarmoqlarga (Telegram, Instagram va h.k.) havola
    // tashlanganda Open Graph/Twitter rasm-manzillari nisbiy holda
    // ("/logo.svg" kabi) beriladi — Next.js ularni to'liq URL'ga
    // aylantirish uchun shu asosiy manzildan foydalanadi. Bu qiymat
    // bo'lmasa, Next.js "http://localhost:3000" ga tushib qoladi va
    // preview rasm/link ishlamay qoladi. Ishlab chiqarish domenini
    // .env orqali (NEXT_PUBLIC_SITE_URL) ham almashtirish mumkin —
    // masalan vaqtinchalik tunnel manzili bilan sinash uchun.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wardrobestore.uz'),
    title: {
      default: `Wardrobe — ${dict.home.heroTitle}`,
      template: '%s — Wardrobe',
    },
    description: dict.home.heroSubtitle,
    icons: {
      icon: '/logo.svg',
      shortcut: '/logo.svg',
    },
    alternates: {
      languages: { uz: '/uz', ru: '/ru' },
    },
    openGraph: {
      title: `Wardrobe — ${dict.home.heroTitle}`,
      description: dict.home.heroSubtitle,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dict = await getDictionary(params.locale);

  return (
    <html lang={params.locale} className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before React hydrates so the page never flashes the wrong
            theme on load — reads the same zustand-persist key ThemeStore
            writes to. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('fashion-marketplace-theme');var theme=raw?JSON.parse(raw).state.theme:'light';if(theme==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>
          <Header locale={params.locale} dict={dict} />
          {/* Header is `fixed`, not `sticky` — it floats over the page
              instead of reserving its own space in the flow (that's what
              lets its top gap show real page content, e.g. the homepage
              hero, blurred through instead of a mismatched plain
              background — see Header.tsx). Since fixed elements don't push
              content down on their own, this padding replaces that lost
              space, sized to match the header's own gap + pill height
              exactly (pt-3 + h-14 = 68px on mobile, pt-4 + h-[68px] = 84px
              from sm: up). The homepage hero cancels this out with a
              matching negative margin so its background still reaches the
              very top of the page — see page.tsx. */}
          <main className="min-h-[70vh] pt-[68px] sm:pt-[84px]">{children}</main>
          <Footer locale={params.locale} dict={dict} />
          {/* Clears the fixed MobileBottomNav below on small screens so the
              end of the Footer isn't hidden behind it; not needed on lg+
              where that nav is hidden. Taller than the nav's own height
              because the nav now floats with its own bottom margin (plus
              the iPhone home-indicator safe area on notched devices)
              instead of sitting flush against the bottom edge. */}
          <div className="h-28 lg:hidden" />
          <MobileBottomNav locale={params.locale} dict={dict} />
        </Providers>
      </body>
    </html>
  );
}
