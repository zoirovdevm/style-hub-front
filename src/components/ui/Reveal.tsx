'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // null = not yet determined (server render / very first client paint).
  // true = this element was ALREADY inside the viewport the moment it
  // mounted on the client — skip the slide-up-and-fade-in animation for
  // it entirely (see the effect below for why). false = normal case:
  // still below the fold at mount, so it plays the intended "fades up as
  // you scroll down to it" animation via whileInView, unchanged.
  const [alreadyInView, setAlreadyInView] = useState<boolean | null>(null);

  // useLayoutEffect (not useEffect): it runs synchronously right after
  // this node is committed to the DOM but BEFORE the browser paints that
  // frame — which is what lets the correction below apply before the user
  // ever sees a single frame of it, instead of some number of visible
  // frames of the wrong state.
  //
  // Why this exists: Reveal wraps section headings and every product card
  // (27 places across the site). On a real iPhone (confirmed via a screen
  // recording), while hydration was still catching up, content already on
  // screen would visibly reset and replay this slide-up animation
  // mid-scroll — because whileInView's IntersectionObserver hadn't fired
  // yet for elements already in view when React finished taking over from
  // the server-rendered HTML, and iOS's much slower hydration (measured
  // separately) gave that gap enough time to become visible as a glitch,
  // right as the user was scrolling past it. Skipping the animation only
  // for elements already in view at mount removes that glitch; anything
  // below the fold still fades up exactly as before once scrolled to.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setAlreadyInView(rect.top < window.innerHeight && rect.bottom > 0);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={alreadyInView ? { opacity: 1, y: 0 } : undefined}
      whileInView={alreadyInView ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={
        alreadyInView ? { duration: 0 } : { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
