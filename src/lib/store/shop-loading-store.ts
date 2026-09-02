'use client';

import { create } from 'zustand';

/**
 * ROOT-CAUSE FIX for "Magazinga o'tganda/filtr bosganda loader (skelet)
 * hech qachon ko'rinmaydi, darhol tayyor kartalar chiqadi":
 *
 * Next.js's `app/[locale]/shop/loading.tsx` (the Suspense fallback) only
 * ever gets a chance to paint if the BYTES actually reach the browser
 * progressively while the server is still awaiting the products query. On
 * this deployment the full response arrives in one piece instead (most
 * likely an in-between reverse proxy buffering the whole response before
 * forwarding it — a very common nginx default) — so by the time the
 * browser sees anything at all, the real, fully-loaded page is already
 * in hand. loading.tsx never gets a moment on screen, no matter how the
 * data fetch itself is written.
 *
 * This store sidesteps that entirely: it doesn't wait on any server
 * signal. `start()` is called the INSTANT a shop-bound click happens
 * (mirroring RouteProgressBar's own proven click-capture technique — see
 * that file), synchronously swapping the shop content area over to a
 * skeleton BEFORE the browser has sent a single byte of the new request.
 * `finish()` fires once Next.js's router reports the URL has actually
 * changed (pathname or query — covers both entering /shop fresh and
 * changing filters/sort/page while already there), which is exactly the
 * moment the freshly-fetched real content is ready to paint. Purely
 * client-side cause and effect — completely unaffected by however the
 * server/proxy chooses to deliver its response.
 */
interface ShopLoadingState {
  pending: boolean;
  start: () => void;
  finish: () => void;
}

export const useShopLoadingStore = create<ShopLoadingState>((set) => ({
  pending: false,
  start: () => set({ pending: true }),
  finish: () => set({ pending: false }),
}));
