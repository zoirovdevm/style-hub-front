'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/') || `/${next}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-900/10 p-1 text-xs font-semibold dark:border-cream/10">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`rounded-full px-2 py-1 uppercase transition-colors sm:px-3 sm:py-1.5 ${
            l === locale
              ? 'bg-gold-500 text-ink-950'
              : 'text-ink-900/60 hover:text-ink-950 dark:text-cream/60 dark:hover:text-cream'
          }`}
          aria-label={localeNames[l]}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
