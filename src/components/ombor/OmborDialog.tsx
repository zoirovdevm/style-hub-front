'use client';

import { useEffect } from 'react';

// Pastdan chiqadigan oyna (telefonda) / markazdagi oyna (kengroq ekranda).
// Tasdiqlash va "muvaffaqiyatli" xabarlari uchun ishlatiladi.
export function OmborDialog({
  open,
  onClose,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Jarayon ketayotganda (masalan olib tashlanayotganda) fonni bosib
  // yopib bo'lmasligi uchun.
  dismissible?: boolean;
}) {
  // Oyna ochiqligida orqadagi sahifa siljimasin.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={() => dismissible && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-panel)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-soft sm:rounded-3xl sm:pb-5"
      >
        {children}
      </div>
    </div>
  );
}
