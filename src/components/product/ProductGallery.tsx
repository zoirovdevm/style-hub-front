'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageLightbox } from './ImageLightbox';

export function ProductGallery({
  images,
  title,
  lightboxImages,
}: {
  images: string[];
  title: string;
  // To'liq ekranli ko'rishda ko'rsatiladigan ro'yxat — odatda tovarning
  // HAMMA rasmlari (boshqa ranglarniki ham). Berilmasa — `images`.
  lightboxImages?: string[];
}) {
  // Relative paths — next.config.js rewrites /uploads/* through to the
  // backend, so this works on localhost and a tunnel URL without changes.
  const list = images.length ? images : ['/placeholder-product.svg'];
  const [active, setActive] = useState(0);
  const viewerList = lightboxImages && lightboxImages.length ? lightboxImages : list;
  // Katta rasm bosilganda to'liq ekranli ko'rish oynasi ochiladi.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Surishdan keyin brauzer "click" ham yuborishi mumkin — u rasm
  // almashtirish o'rniga oynani ochib yubormasligi uchun belgi.
  const swipedRef = useRef(false);

  const src = list[active];

  function goTo(index: number) {
    if (index < 0 || index >= list.length) return;
    setActive(index);
  }

  // ── Barmoq bilan surish (swipe) ─────────────────────────────────────
  // Avval rasmni faqat yon tomondagi tugmalar almashtirardi; telefonda
  // esa tabiiy harakat — surish. O'ngdan chapga surilsa keyingi rasm,
  // chapdan o'ngga surilsa oldingisi ko'rsatiladi.
  //
  // Nozik jihat: sahifani vertikal scroll qilish buzilmasligi kerak.
  // Shuning uchun boshlang'ich nuqtadan gorizontal va vertikal siljish
  // solishtiriladi — harakat ko'proq tik bo'lsa, u scroll deb
  // hisoblanadi va rasm umuman almashmaydi.
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  // Shu masofadan (px) kamroq siljish — tasodifiy tegish deb qaraladi.
  const SWIPE_MIN = 40;

  function handleTouchStart(e: React.TouchEvent) {
    swipedRef.current = false;
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || list.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
    swipedRef.current = true;
    // dx < 0 — barmoq chapga ketdi (o'ngdan chapga) → keyingi rasm.
    goTo(dx < 0 ? active + 1 : active - 1);
  }

  function openLightbox() {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    setLightboxOpen(true);
  }

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {list.length > 1 && (
        <div className="flex shrink-0 gap-3 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
          {list.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => goTo(i)}
              // Thumbnail's active/focus ring stays in sync with the main
              // image automatically — it's driven off the same `active`
              // state the arrows below update, not its own separate state.
              aria-current={active === i}
              aria-label={`${title} ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors duration-300 ${
                active === i ? 'border-gold-500' : 'border-transparent hover:border-gold-500/40'
              }`}
            >
              <Image
                src={img}
                alt={`${title} ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={openLightbox}
        role="button"
        tabIndex={0}
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
        // `touch-pan-y` — brauzerga "bu yerda faqat tik scroll seniki,
        // gorizontal harakatni o'zim boshqaraman" deydi. Busiz ba'zi
        // brauzerlar yonlamasiga surishni sahifa scroll'i deb talqin
        // qilib, hodisani bizga umuman bermasdi.
        className="relative aspect-[3/4] flex-1 cursor-zoom-in touch-pan-y select-none overflow-hidden rounded-3xl bg-ink-900/5">
        {/* Rasmdan rasmga o'tishda animatsiya YO'Q (so'rovga ko'ra):
            avval har almashinuvda 350ms lik erish + kichik masshtab
            effekti bor edi — barmoq bilan tez surilganda u orqada
            qolib, sust ko'rinardi. Endi yangi rasm darhol
            ko'rsatiladi. */}
        <div className="absolute inset-0">
          <Image src={src} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" unoptimized />
        </div>

        {list.length > 1 && (
          <>
            {/* Yon tomonlardagi "oldingi/keyingi" tugmalari OLIB
                TASHLANDI (so'rovga ko'ra). Rasm endi barmoq bilan
                surib almashtiriladi (yuqoridagi swipe izohiga qarang),
                kompyuterda esa chetdagi kichik rasmlar (thumbnail)
                bosiladi — ular doim ko'rinib turadi. Pastdagi nuqtalar
                nechanchi rasm ko'rsatilayotganini bildiradi. */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {list.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? 'w-5 bg-gold-500' : 'w-1.5 bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={viewerList}
          startIndex={Math.max(0, viewerList.indexOf(list[active]))}
          title={title}
          onClose={() => setLightboxOpen(false)}
          // Ko'rilayotgan rasm shu rangniki bo'lsa — sahifadagi galereya ham
          // o'sha rasmga o'tadi (boshqa rangniki bo'lsa, o'zgarmaydi).
          onIndexChange={(i) => {
            const j = list.indexOf(viewerList[i]);
            if (j >= 0) setActive(j);
          }}
        />
      )}
    </div>
  );
}
