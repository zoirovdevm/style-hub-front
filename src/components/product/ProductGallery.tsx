'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  // Relative paths — next.config.js rewrites /uploads/* through to the
  // backend, so this works on localhost and a tunnel URL without changes.
  const list = images.length ? images : ['/placeholder-product.svg'];
  const [active, setActive] = useState(0);

  const src = list[active];
  const isFirst = active === 0;
  const isLast = active === list.length - 1;

  function goTo(index: number) {
    if (index < 0 || index >= list.length) return;
    setActive(index);
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

      <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-3xl bg-ink-900/5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <Image src={src} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" unoptimized />
          </motion.div>
        </AnimatePresence>

        {list.length > 1 && (
          <>
            {/* Always visible (not hover-only) so they still work on
                touch/mobile, where there's no hover state at all. Disabled
                + dimmed at either end instead of wrapping around. */}
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={isFirst}
              aria-label="Oldingi rasm"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-950 shadow-soft backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100 dark:bg-ink-950/70 dark:text-cream dark:hover:bg-ink-950 sm:h-10 sm:w-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={isLast}
              aria-label="Keyingi rasm"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-950 shadow-soft backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100 dark:bg-ink-950/70 dark:text-cream dark:hover:bg-ink-950 sm:h-10 sm:w-10"
            >
              <ChevronRight size={20} />
            </button>

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
    </div>
  );
}
