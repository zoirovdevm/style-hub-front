'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const list = images.length ? images : ['/placeholder-product.svg'];
  const [active, setActive] = useState(0);

  const src = list[active].startsWith('/placeholder') ? list[active] : `${apiUrl}${list[active]}`;

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {list.length > 1 && (
        <div className="flex shrink-0 gap-3 sm:flex-col">
          {list.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                active === i ? 'border-gold-500' : 'border-transparent'
              }`}
            >
              <Image
                src={img.startsWith('/placeholder') ? img : `${apiUrl}${img}`}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <Image src={src} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" unoptimized />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
