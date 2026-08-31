import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { serverFetchGraphQL } from '@/lib/graphql/server-fetch';
import { GET_PRODUCT_STR, GET_PRODUCTS_STR } from '@/lib/graphql/server-queries';
import { ProductGalleryForColor } from '@/components/product/ProductGalleryForColor';
import { ProductActions } from '@/components/product/ProductActions';
import { ProductColorProvider } from '@/lib/store/product-color-context';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import { formatPrice } from '@/lib/utils/format';

interface ProductPageProps {
  params: { locale: Locale; slug: string };
}

async function fetchProduct(slug: string) {
  try {
    const data = await serverFetchGraphQL<{ product: any }>(GET_PRODUCT_STR, { slug }, 0);
    return data.product;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) return {};

  const title = params.locale === 'ru' && product.titleRu ? product.titleRu : product.title;
  const description = (params.locale === 'ru' && product.descriptionRu ? product.descriptionRu : product.description)?.slice(
    0,
    160,
  );

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images?.length ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { locale, slug } = params;
  const dict = await getDictionary(locale);
  const product = await fetchProduct(slug);

  if (!product) notFound();

  const similarData = await serverFetchGraphQL<{ products: { list: ProductCardData[] } }>(
    GET_PRODUCTS_STR,
    { filter: { categorySlug: product.category?.slug, page: 1, limit: 4, sort: 'NEWEST' } },
    30,
  ).catch(() => ({ products: { list: [] } }));

  const similar = (similarData.products.list ?? []).filter((p) => p.id !== product.id);

  const title = locale === 'ru' && product.titleRu ? product.titleRu : product.title;
  const description = locale === 'ru' && product.descriptionRu ? product.descriptionRu : product.description;
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;

  // Total stock across every size/color combination, not just the overall
  // `stock` field (which some products don't keep in sync with their real
  // variant rows). Falls back to `stock` for older/simple products that
  // have no variant data at all.
  const productVariants: { size: string; color: string; stock: number }[] = product.variants ?? [];
  const totalStock =
    productVariants.length > 0
      ? productVariants.reduce((sum: number, v: { stock: number }) => sum + (v.stock ?? 0), 0)
      : product.stock;

  return (
    <div className="container-app py-12">
      {/* ProductColorProvider shares the selected color between the two
          sibling client components below — ProductActions (the size/color
          picker) writes to it, ProductGalleryForColor reads it to show that
          color's dedicated photos, per the "picking blue should show the
          blue shirt's photos" request. Initial color mirrors ProductActions'
          own first-available-color logic loosely (just colors[0] here); if
          that color turns out to be out of stock for the default size,
          ProductActions corrects it on mount and the gallery updates then. */}
      <ProductColorProvider initialColor={product.colors?.[0] ?? ''}>
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <ProductGalleryForColor
            images={product.images ?? []}
            colorImages={product.colorImages ?? []}
            title={title}
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div>
            {product.category && (
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-900/40">
                {locale === 'ru' && product.category.nameRu ? product.category.nameRu : product.category.name}
                {product.brand ? ` · ${product.brand.name}` : ''}
              </p>
            )}
            <h1 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{title}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-bold">{formatPrice(product.price, locale)}</span>
              {hasDiscount && (
                <span className="text-base text-ink-900/40 line-through">{formatPrice(product.oldPrice, locale)}</span>
              )}
              {hasDiscount && (
                <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-bold text-gold-600">
                  -{Math.round(100 - (product.price / product.oldPrice) * 100)}%
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-ink-900/50 dark:text-cream/50">
              {totalStock > 0 ? (
                <>
                  {dict.product.totalInStock}
                  {' '}
                  {totalStock} {dict.product.stockLeft}
                  {/* Neutral black/white instead of red per request — the
                      color no longer carries the "urgent" signal here,
                      that now lives in the amber per-variant message below
                      the size/color pickers. */}
                  {totalStock <= 5 && (
                    <span className="ml-1.5 font-bold text-ink-950 dark:text-cream">{dict.product.lastPieces}</span>
                  )}
                </>
              ) : (
                dict.product.outOfStock
              )}
              {' · '}
              {product.reviewsCount} {dict.product.reviews}
            </p>

            {description && <p className="mt-6 text-sm leading-relaxed text-ink-900/70">{description}</p>}

            <div className="mt-8 border-t border-ink-900/10 pt-8">
              <ProductActions
                productId={product.id}
                title={title}
                price={product.price}
                sizes={product.sizes ?? []}
                colors={product.colors ?? []}
                stock={product.stock}
                variants={product.variants ?? []}
                dict={dict}
                locale={locale}
              />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-ink-900/10 pt-8 text-sm">
              <div>
                <p className="text-xs text-ink-900/40">{dict.product.sku}</p>
                <p className="font-semibold">{product.sku}</p>
              </div>
              {product.brand && (
                <div>
                  <p className="text-xs text-ink-900/40">{dict.product.brand}</p>
                  <p className="font-semibold">{product.brand.name}</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
      </ProductColorProvider>

      <ProductReviews productId={product.id} locale={locale} dict={dict} />

      {similar.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="section-title">{dict.product.similar}</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} locale={locale} dict={dict} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
