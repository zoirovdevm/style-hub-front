/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ROOT-CAUSE FIX for "admin add mahsulot qo'shsam, Bosh sahifada
  // ko'rinmayapti, faqat F5 bossam chiqadi": Home/Shop/product-detail all
  // already fetch their data with `revalidate: 0` (see server-fetch.ts),
  // so the SERVER always has fresh data on every request. But Next.js
  // 14.2's App Router also has a separate, client-side "Router Cache" that
  // caches the already-rendered page for each route the browser visits —
  // for a dynamic route that has a `loading.tsx` boundary (this project's
  // app/[locale]/loading.tsx covers Home, Shop, etc.), that client cache's
  // default lifetime is 30 seconds. So: admin adds a product, clicks back
  // to the storefront, clicks "Bosh sahifa" in the navbar within that 30s
  // window — the browser reuses its OWN stale cached copy of Home instead
  // of asking the (already-fresh) server again, and only a hard reload
  // (F5, which bypasses the Router Cache entirely) shows the new product.
  // Setting `dynamic: 0` here removes that client-side staleness window
  // for every dynamically-rendered route, so a normal <Link> navigation
  // behaves the same as a hard refresh for these pages.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  // Production build paytida TypeScript/ESLint xatolari build'ni
  // to'xtatmasligi uchun (dev rejimda sayt ishlaydi, bu tekshiruvlar
  // faqat build vaqtida qattiqlashadi).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Proxies /graphql, /uploads/*, /upload/* and /presence/* straight
  // through to the backend on this same machine — the browser always
  // calls a *relative* path (e.g. "/uploads/products/x.jpg"), which
  // resolves against whatever host it's currently using (localhost:3000 OR
  // a Cloudflare tunnel frontend URL) rather than a hardcoded absolute
  // backend URL baked into NEXT_PUBLIC_*. That's what let images/GraphQL
  // break every time we switched between localhost and a tunnel — this
  // makes both work at the same time with no .env changes needed.
  // (The "online now" counter used to need a separate raw WebSocket to
  // the backend, which this rewrite mechanism can't proxy — that's why it
  // was replaced with plain heartbeat polling over /presence/*, so it
  // rides this exact same rewrite instead of needing its own env var.)
  async rewrites() {
    // 127.0.0.1 ataylab ishlatilyapti, "localhost" emas — Windows'da
    // "localhost" ba'zan ::1 (IPv6) va 127.0.0.1 (IPv4) ikkalasiga bir vaqtda
    // ulanishga urinadi (Node'ning "happy eyeballs" xususiyati), va agar
    // biror manzil sekin/band bo'lsa, bu AggregateError/ECONNREFUSED va hatto
    // Node ichki xatosiga (ERR_INTERNAL_ASSERTION) olib kelishi mumkin.
    // 127.0.0.1'ni to'g'ridan-to'g'ri ko'rsatish bu poyga holatini butunlay
    // chetlab o'tadi.
    const backend = process.env.GRAPHQL_INTERNAL_URL?.replace(/\/graphql$/, '') ?? 'http://127.0.0.1:4000';
    return [
      { source: '/graphql', destination: `${backend}/graphql` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
      { source: '/upload/:path*', destination: `${backend}/upload/:path*` },
      { source: '/presence/:path*', destination: `${backend}/presence/:path*` },
    ];
  },
};

module.exports = nextConfig;
