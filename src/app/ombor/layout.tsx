import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import '../globals.css';

// Wardrobe Ombor — Telegram Mini App.
//
// Bu ALOHIDA ildiz layout: saytning [locale]/layout.tsx'idagi header,
// footer, pastki menyu va Apollo provayderlari bu yerda yo'q — Mini App
// o'zining ixcham qobig'iga ega. Lekin dizayn bir xil: aynan o'sha
// globals.css (ranglar, chegaralar, tugmalar, tungi rejim) va o'sha Inter
// shrifti ulanadi, ya'ni ko'rinish saytnikidan farq qilmaydi.

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Wardrobe Ombor',
  // Ichki ish vositasi — qidiruv tizimlarida chiqmasligi kerak.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // iPhone "chiqiq"i va pastki chiziq atrofidagi xavfsiz hududlar
  // (env(safe-area-inset-*)) to'g'ri hisoblanishi uchun.
  viewportFit: 'cover',
};

export default function OmborLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Mavzuni React yuklanishidan OLDIN qo'llaydi — oq/qora "miltillash"
            bo'lmasligi uchun. Saytdagi bilan bir xil kalit
            (fashion-marketplace-theme, lib/store/theme-store.ts). Saqlangan
            tanlov bo'lmasa — Telegram'ning o'z mavzusi. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('fashion-marketplace-theme');var t=raw?JSON.parse(raw).state.theme:null;if(!t){var tg=window.Telegram&&window.Telegram.WebApp;t=tg&&tg.colorScheme==='dark'?'dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-cream text-ink-900 dark:bg-ink-950 dark:text-cream">
        {/* Telegram Mini App SDK — initData, BackButton, HapticFeedback. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
