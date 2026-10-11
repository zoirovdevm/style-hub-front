'use client';

import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/lib/store/theme-store';
import type { OmborLang } from '@/lib/ombor/i18n';

// Header, kirish sahifasi va profilda ishlatiladigan kichik boshqaruvlar:
// UZ/RU almashtirgich va yorug'/tungi mavzu tugmasi.

export function LangSwitch({ lang, onChange }: { lang: OmborLang; onChange: (l: OmborLang) => void }) {
  return (
    <div className="flex h-9 items-center rounded-[10px] border border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] p-0.5">
      {(['uz', 'ru'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={`h-full px-2.5 text-xs font-bold uppercase transition-colors ${
            lang === l ? 'bg-gold-500 text-white' : 'text-ink-900/55 dark:text-cream/55'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggleTheme);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Light' : 'Dark'}
      className="flex h-9 w-9 items-center justify-center border border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] text-ink-950 dark:text-cream"
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
