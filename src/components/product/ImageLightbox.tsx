'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useScrollLock } from '@/lib/hooks/use-scroll-lock';

// TOVAR RASMINI TO'LIQ EKRANDA KO'RISH (lightbox).
//
// Tovar sahifasidagi katta rasm bosilganda ochiladi:
//   • rasm butun ekranga sig'adigan qilib, qora fonda ko'rsatiladi;
//   • rasmni bosish (telefonda bir marta tegish) — 2.5 barobar
//     kattalashtiradi, yana bosish — asl holiga qaytaradi;
//   • kattalashgan holatda sichqoncha yoki barmoq qayerda bo'lsa, rasmning
//     o'sha joyi ko'rinadi (surib ko'rish);
//   • telefonda yonga surish — keyingi/oldingi rasm; kompyuterda sichqoncha
//     g'ildiragi (scroll), ← → tugmalari va klaviaturadagi strelkalar;
//   • tovarning HAMMA rasmlari ko'rinadi — boshqa ranglarniki ham (qora
//     futbolka ochilgan bo'lsa, surilganda ko'k rangdagisi ham chiqadi);
//   • yopish — ✕ tugmasi, Esc yoki rasmdan tashqaridagi qora joyni bosish.
//
// Portal orqali to'g'ridan-to'g'ri <body> ga chiziladi — sahifadagi
// transform/overflow'li ota elementlar uni kesib qo'ymasligi uchun.

const ZOOM = 2.5;
const SWIPE_MIN = 40;

export function ImageLightbox({
  images,
  startIndex,
  title,
  onClose,
  onIndexChange,
}: {
  images: string[];
  startIndex: number;
  title: string;
  onClose: () => void;
  // Yopilganda tovar sahifasida ham oxirgi ko'rilgan rasm turishi uchun.
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  // Kattalashtirish markazi (rasmning foizlarda).
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [mounted, setMounted] = useState(false);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useScrollLock(true);
  useEffect(() => setMounted(true), []);

  const count = images.length;

  useEffect(() => {
    onIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function go(delta: number) {
    if (count < 2) return;
    setZoomed(false);
    setIndex((i) => (i + delta + count) % count);
  }

  // Klaviatura: Esc — yopish, ← → — rasm almashtirish.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, onClose]);

  // Sichqoncha g'ildiragi: pastga — keyingi, tepaga — oldingi rasm.
  // Trackpad bitta harakatda o'nlab hodisa yuboradi, shuning uchun
  // rasm almashgandan keyin qisqa vaqt yangi hodisalar e'tiborga olinmaydi.
  const wheelLock = useRef(0);
  function onWheel(e: React.WheelEvent) {
    if (zoomed || count < 2) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 8) return;
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    go(delta > 0 ? 1 : -1);
  }

  function originFrom(clientX: number, clientY: number) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function toggleZoomAt(clientX: number, clientY: number) {
    if (zoomed) {
      setZoomed(false);
    } else {
      setOrigin(originFrom(clientX, clientY));
      setZoomed(true);
    }
  }

  // ── Sichqoncha (kompyuter) ──
  function onImageClick(e: React.MouseEvent) {
    e.stopPropagation();
    // Telefonda bosish touch-hodisalarda alohida ko'riladi (pastda).
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return;
    toggleZoomAt(e.clientX, e.clientY);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!zoomed) return;
    setOrigin(originFrom(e.clientX, e.clientY));
  }

  // ── Barmoq (telefon) ──
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchMove(e: React.TouchEvent) {
    // Kattalashgan holatda barmoq qayerda bo'lsa, rasmning o'sha joyi ko'rinadi.
    if (!zoomed || e.touches.length !== 1) return;
    const t = e.touches[0];
    setOrigin(originFrom(t.clientX, t.clientY));
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const moved = Math.hypot(dx, dy);

    // Yonga surish — faqat kattalashmagan holatda rasm almashadi.
    if (!zoomed && Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    // Pastga kuchli surish — yopish (kattalashmagan holatda).
    if (!zoomed && dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }
    // Qisqa tegish — kattalashtirish / qaytarish.
    if (moved < 10 && Date.now() - start.t < 350) {
      // preventDefault — tegishdan keyin brauzer yuboradigan "click"
      // (u fon bosilgandek oynani yopib yuborardi) o'chiriladi.
      e.preventDefault();
      toggleZoomAt(t.clientX, t.clientY);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 text-white"
      onClick={onClose}
      onWheel={onWheel}
    >
      {/* Yuqori qator: nechanchi rasm + yopish */}
      <div
        className="flex items-center justify-between px-4 pb-2 pt-[calc(12px+env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-semibold tabular-nums text-white/80">
          {count > 1 ? `${index + 1} / ${count}` : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="flex h-10 w-10 items-center justify-center bg-white/10 text-white hover:bg-white/20"
        >
          <X size={22} />
        </button>
      </div>

      {/* Rasm maydoni */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          key={images[index]}
          src={images[index]}
          alt={`${title} ${index + 1}`}
          draggable={false}
          onClick={onImageClick}
          onMouseMove={onMouseMove}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: zoomed ? `scale(${ZOOM})` : 'scale(1)',
            transformOrigin: `${origin.x}% ${origin.y}%`,
            touchAction: 'none',
          }}
          className={`max-h-full max-w-full select-none object-contain transition-transform duration-200 ${
            zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
        />

        {/* Kompyuterda: chap/o'ng tugmalari (telefonda surish yetarli) */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Oldingi"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-white hover:bg-white/20 md:flex"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              aria-label="Keyingi"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-white hover:bg-white/20 md:flex"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* Pastki nuqtalar */}
      {count > 1 && (
        <div
          className="flex justify-center gap-1.5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
