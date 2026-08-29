'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CarouselCategory = {
  id: string;
  name: string;
  nameRu?: string | null;
  slug: string;
  description?: string | null;
};

// Replaces the earlier horizontal-scrolling marquee of separate category
// cards, per request: now it's ONE big box, and the categories rotate
// *inside* that single box (crossfade) instead of many cards sliding past.
// Needs to be a client component since the rotation is timer-driven state —
// a pure-CSS keyframe approach doesn't work here because the category count
// is dynamic (comes from the backend at request time), so there's no fixed
// number of steps to hand-author keyframes for.
export function CategoryCarousel({
  categories,
  locale,
}: {
  categories: CarouselCategory[];
  locale: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (categories.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % categories.length);
    }, 3500);
    return () => clearInterval(id);
    // Only the count matters for restarting the interval — categories
    // themselves come from a server fetch and don't change identity on
    // every render, but length is the one thing that'd actually require a
    // fresh interval (e.g. hot-reload swapping the list in dev).
  }, [categories.length]);

  if (categories.length === 0) return null;

  // Clamp in case the list shrinks (e.g. a category gets deleted) while a
  // stale index from a previous render is still in state.
  const current = categories[index % categories.length];

  return (
    <Link
      href={`/${locale}/shop?category=${current.slug}`}
      prefetch={false}
      className="group relative flex h-64 w-full items-center justify-center overflow-hidden rounded-3xl bg-ink-950 text-cream shadow-soft transition-transform duration-300 hover:-translate-y-1 sm:h-80"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 opacity-90 transition-opacity group-hover:opacity-100" />
      {/* blur-2xl removed on both accent circles (heavy-CSS cleanup, per
          request) — same soft accent circles, just without the
          filter:blur() cost. */}
      <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gold-500/10 transition-transform duration-500 group-hover:scale-125" />
      <div className="absolute -left-10 -bottom-10 h-56 w-56 rounded-full bg-gold-600/8 transition-transform duration-500 group-hover:scale-125" />

      {/* Every category's content is stacked in the same spot; only the
          active one is opaque. Crossfading via opacity (rather than
          mounting/unmounting) keeps the box's height stable and avoids a
          layout jump every 3.5s. */}
      {categories.map((cat, i) => (
        <div
          key={cat.id}
          className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-opacity duration-700 ease-in-out ${
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={i !== index}
        >
          <span className="font-display text-4xl font-medium sm:text-5xl">
            {locale === 'ru' && cat.nameRu ? cat.nameRu : cat.name}
          </span>
          {cat.description && (
            <p className="relative mt-3 max-w-md text-sm text-cream/60">{cat.description}</p>
          )}
        </div>
      ))}

      {/* Dot indicators, only worth showing once there's more than one
          category to indicate progress through. */}
      {categories.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {categories.map((cat, i) => (
            <span
              key={cat.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-gold-400' : 'w-1.5 bg-cream/30'
              }`}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
