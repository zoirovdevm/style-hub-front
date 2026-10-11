// Telegram Mini App SDK (telegram-web-app.js) uchun minimal turlar va
// yordamchilar. Skript app/ombor/layout.tsx da yuklanadi.

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; username?: string; language_code?: string } };
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'success' | 'warning' | 'error'): void;
  };
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return ((window as any).Telegram?.WebApp as TelegramWebApp | undefined) ?? null;
}

// Haptik javob — Telegram tashqarisida (yoki eski klientda) jimgina
// hech narsa qilmaydi.
export function haptic(type: 'success' | 'warning' | 'error' | 'light') {
  const h = getTelegram()?.HapticFeedback;
  if (!h) return;
  try {
    if (type === 'light') h.impactOccurred('light');
    else h.notificationOccurred(type);
  } catch {
    /* klient qo'llamaydi */
  }
}
