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
    <div className="flex items-center gap-1 rounded-full border border-ink-900/10 p-1 text-xs font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`rounded-full px-3 py-1.5 uppercase transition-colors ${
            l === locale ? 'bg-ink-950 text-cream' : 'text-ink-900/60 hover:text-ink-950'
          }`}
          aria-label={localeNames[l]}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
