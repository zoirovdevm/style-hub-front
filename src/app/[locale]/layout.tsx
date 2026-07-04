import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const dict = await getDictionary(params.locale);
  return {
    title: {
      default: `StyleHub — ${dict.home.heroTitle}`,
      template: '%s — StyleHub',
    },
    description: dict.home.heroSubtitle,
    alternates: {
      languages: { uz: '/uz', ru: '/ru' },
    },
    openGraph: {
      title: `StyleHub — ${dict.home.heroTitle}`,
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
          <main className="min-h-[70vh]">{children}</main>
          <Footer locale={params.locale} dict={dict} />
        </Providers>
      </body>
    </html>
  );
}
