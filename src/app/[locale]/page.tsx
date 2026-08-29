import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { serverFetchGraphQL } from '@/lib/graphql/server-fetch';
import { GET_BEST_SELLERS_STR, GET_CATEGORIES_STR } from '@/lib/graphql/server-queries';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { CategoryCarousel } from '@/components/ui/CategoryCarousel';

type HomeCategory = {
  id: string;
  name: string;
  nameRu?: string | null;
  slug: string;
  description?: string | null;
};

// Each "why us" card gets its own icon + accent color (matching the four
// items in the dictionary, in order: originals / delivery / trust /
// payment) — a soft tinted square in light mode, the same hue at low
// opacity on a dark card in dark mode, so the row reads as four distinct
// colors instead of one repeated brand tone.
const WHY_ITEMS = [
  { icon: CheckCircle2, ring: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { icon: Truck, ring: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  { icon: ShieldCheck, ring: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
  { icon: CreditCard, ring: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
];

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  // The temporary `?stage=N` diagnostic scaffolding (used to binary-isolate
  // the ~30s iOS Safari stall down to Header's backdrop-blur + Hero's glow
  // blobs — see Header.tsx for the full finding) has done its job and is
  // removed now that the fix (no more blur/backdrop-blur anywhere on the
  // site) is in place. This is back to a plain Home page again.
  const { locale } = params;
  const dict = await getDictionary(locale);

  // Categories section is back on the home page (previously removed) — this
  // time as the BANNER section's content, replacing the old static
  // image+text pair with an auto-scrolling carousel of category cards. The
  // GET_SITE_SETTINGS_STR/heroImage fetch that only fed that static image is
  // gone since nothing renders it anymore; GET_CATEGORIES_STR (the same
  // query the /categories page already uses) takes its place.
  const [bestSellersData, categoriesData] = await Promise.all([
    serverFetchGraphQL<{ bestSellers: ProductCardData[] }>(GET_BEST_SELLERS_STR, { limit: 8 }).catch(() => ({
      bestSellers: [],
    })),
    // revalidate: 0 — a newly added/renamed category should show up in the
    // carousel on the next request, not wait out a stale cached page.
    serverFetchGraphQL<{ categories: HomeCategory[] }>(GET_CATEGORIES_STR, undefined, 0).catch(() => ({
      categories: [],
    })),
  ]);

  const bestSellers = bestSellersData.bestSellers ?? [];
  const categories = categoriesData.categories ?? [];

  // Splits the hero heading around its one highlighted word so only that
  // word can get its own color/italic styling — the dictionary string
  // itself stays plain text (no embedded HTML), this just locates
  // "премиум"/"premium" within it at render time. Falls back to rendering
  // the whole heading unstyled if the word isn't found for some reason
  // (e.g. a future translation edit removes it) rather than crashing.
  const heroTitleHighlightWord = locale === 'ru' ? 'премиум' : 'premium';
  const heroTitleSplitIndex = dict.home.heroTitle.indexOf(heroTitleHighlightWord);
  const heroTitleBefore =
    heroTitleSplitIndex >= 0 ? dict.home.heroTitle.slice(0, heroTitleSplitIndex) : dict.home.heroTitle;
  const heroTitleHighlight = heroTitleSplitIndex >= 0 ? heroTitleHighlightWord : '';
  const heroTitleAfter =
    heroTitleSplitIndex >= 0 ? dict.home.heroTitle.slice(heroTitleSplitIndex + heroTitleHighlightWord.length) : '';

  return (
    <div>
      {/* HERO */}
      {/* -mt-[68px]/pt-[68px] (and the sm: pair) cancel out <main>'s new
          top padding exactly, then re-add the same amount as the section's
          OWN padding — net effect: the visible content below is positioned
          exactly like before, but this section's background now extends
          all the way to the very top of the page, behind the floating
          (fixed) header, instead of stopping where <main> used to start.
          That's what lets the header's glass actually show this section
          blurred through it instead of a plain mismatched background.
          This section used to be unconditionally dark (bg-ink-950, no
          dark: pairing) even in light theme — deliberately, so it always
          had presence — but per request it now follows the site's normal
          light/dark theme like everything else (white+ink text in light
          mode, the old dark+cream look preserved for dark mode), so no
          `data-navbar-contrast` flag is needed anymore either: the header
          can just use its normal light-theme styling here since the
          background underneath it now actually matches. */}
      <section className="relative -mt-[68px] overflow-hidden bg-white pt-[68px] text-ink-950 dark:bg-ink-950 dark:text-cream sm:-mt-[84px] sm:pt-[84px]">
        {/* Very faint edge-to-edge base tint, so the far corners/edges
            aren't completely bare — kept much lighter than the blobs below
            so the glow still reads as concentrated toward the center/text,
            not uniform. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(5,150,105,0.03) 100%)',
          }}
        />
        {/* ROOT-CAUSE FIX — the 5 large colorful glow-orb divs that used to
            sit here (each `blur-[100-150px]`) are removed entirely per
            explicit request. A staged isolation test confirmed these,
            combined with the header's backdrop-blur sampling them through
            its glass (see Header.tsx), were what produced the ~30s iOS
            stall — WebKit had to keep re-rasterizing a huge, heavily
            blurred, colorful area on every frame. The header no longer
            uses backdrop-blur either, so this section no longer needs to
            supply anything for it to blur — the plain gradient tint below
            is the only decorative background left, and it's cheap (a
            static CSS gradient, no filter/blur involved). */}
        <div className="container-app relative flex min-h-[640px] flex-col justify-center py-24">
          {/* Long accent line above the eyebrow text — left-aligned with
              the text block (same starting edge as everything below it)
              and wide enough to read as a divider across the content area,
              fading out toward the right rather than ending abruptly. */}
          <Reveal>
            <div className="mb-6 h-px w-full max-w-md bg-gradient-to-r from-gold-500 via-gold-500/40 to-transparent" />
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">
              {dict.home.heroEyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="max-w-2xl font-display text-5xl font-medium leading-tight sm:text-6xl lg:text-7xl">
              {/* Only the one highlighted word ("премиум"/"premium") gets
                  the exact accent green + italic treatment — everything
                  else in the heading keeps its normal color, per request. */}
              {heroTitleBefore}
              {heroTitleHighlight && (
                <em className="italic" style={{ color: '#10b981' }}>
                  {heroTitleHighlight}
                </em>
              )}
              {heroTitleAfter}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-lg text-base text-ink-900/60 dark:text-cream/70">{dict.home.heroSubtitle}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap gap-4">
              {/* .btn-primary now IS the green gradient by default (see
                  globals.css) — no per-page override needed here anymore. */}
              <Link href={`/${locale}/shop`} className="btn-primary">
                {dict.home.shopNow}
                <ArrowRight size={16} />
              </Link>
              <Link href={`/${locale}/categories`} className="btn-outline">
                {dict.home.exploreCategories}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY US */}
      <section className="relative overflow-hidden border-b border-ink-900/5 bg-gradient-to-b from-emerald-50/60 via-white to-white py-16 dark:border-cream/5 dark:from-ink-950 dark:via-ink-950 dark:to-ink-950">
        <div className="container-app grid grid-cols-2 gap-5 lg:grid-cols-4">
          {dict.home.whyUsItems.map((item, i) => {
            const { icon: Icon, ring } = WHY_ITEMS[i % WHY_ITEMS.length];
            return (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="flex h-full flex-col items-start gap-4 rounded-2xl border border-ink-900/8 bg-white p-6 transition-transform hover:-translate-y-1 dark:border-cream/10 dark:bg-ink-900/60">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${ring}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-950 dark:text-cream">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-900/55 dark:text-cream/55">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* BEST SELLERS — shown before the category grid, per request: product
          cards should be the first thing shoppers see below the fold, with
          "shop by category" browsing further down as a secondary option. */}
      <section className="bg-white py-20 dark:bg-ink-950">
        <div className="container-app">
          <div className="flex items-end justify-between">
            <Reveal>
              <h2 className="section-title">{dict.home.bestSellers}</h2>
            </Reveal>
            {/* Site's green accent instead of plain gray, with a hover
                effect: the text deepens and the arrow nudges right —
                per request. */}
            <Link
              href={`/${locale}/shop`}
              className="group hidden items-center gap-1 text-sm font-semibold text-gold-600 transition-colors duration-300 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 sm:flex"
            >
              {dict.home.shopNow}
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {bestSellers.length === 0 ? (
            <p className="mt-10 text-sm text-ink-900/50">{dict.product.noResults}</p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {bestSellers.map((product, i) => (
                <Reveal key={product.id} delay={i * 0.05}>
                  <ProductCard product={product} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BANNER */}
      <section className="relative overflow-hidden bg-white py-20 dark:bg-ink-950">
        {/* Same soft blurred-glow treatment as the hero up top. Per latest
            request the section's own base fill is pulled close to
            white/black (matching the hero's bg-white/dark:bg-ink-950) so the
            glow blobs read as the dominant color signal — blobs are bigger,
            more opaque, and more blurred than the earlier passes. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(5,150,105,0.03) 100%)',
          }}
        />
        {/* ROOT-CAUSE FIX — the 3 glow-orb divs (blur-[140-170px]) that used
            to sit here are removed entirely, same reasoning as the Hero
            section above: no more backdrop-blur anywhere on the page means
            nothing needs a heavily blurred backdrop to show through, and
            these were themselves an expensive `filter: blur()` cost on
            every paint. */}
        <div className="container-app relative">
          <div className="flex items-end justify-between">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-600">{dict.home.newArrivals}</p>
              <h2 className="mt-4 font-display text-3xl font-medium sm:text-4xl dark:text-cream">{dict.nav.categories}</h2>
            </Reveal>
            <Link
              href={`/${locale}/categories`}
              className="group hidden items-center gap-1 text-sm font-semibold text-gold-600 transition-colors duration-300 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 sm:flex"
            >
              {dict.home.exploreCategories}
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Category showcase — per follow-up request this is no longer a
            row of separate cards scrolling past each other; it's ONE big
            box, and the categories rotate (crossfade) inside that single
            box instead. See CategoryCarousel.tsx for the rotation itself
            (timer-driven, since the category count is dynamic). */}
        <div className="container-app relative mt-10">
          {categories.length === 0 ? (
            <p className="text-sm text-ink-900/50 dark:text-cream/50">{dict.product.noResults}</p>
          ) : (
            <Reveal delay={0.15}>
              <CategoryCarousel categories={categories} locale={locale} />
            </Reveal>
          )}
        </div>
      </section>
    </div>
  );
}
