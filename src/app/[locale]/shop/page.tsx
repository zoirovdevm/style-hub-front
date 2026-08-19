import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { serverFetchGraphQL } from '@/lib/graphql/server-fetch';
import { GET_PRODUCTS_STR, GET_CATEGORIES_STR } from '@/lib/graphql/server-queries';
import { ProductCard, type ProductCardData } from '@/components/ui/ProductCard';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { SortDropdown } from '@/components/shop/SortDropdown';
import { Pagination } from '@/components/ui/Pagination';
import { Reveal } from '@/components/ui/Reveal';

interface ShopPageProps {
  params: { locale: Locale };
  searchParams: Record<string, string | undefined>;
}

const LIMIT = 12;

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const { locale } = params;
  const dict = await getDictionary(locale);

  const page = Number(searchParams.page ?? '1') || 1;
  const filter = {
    search: searchParams.search || undefined,
    categorySlug: searchParams.category || undefined,
    sizes: searchParams.sizes ? searchParams.sizes.split(',') : undefined,
    colors: searchParams.colors ? searchParams.colors.split(',') : undefined,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    sort: searchParams.sort || 'NEWEST',
    page,
    limit: LIMIT,
  };

  const [productsData, categoriesData] = await Promise.all([
    serverFetchGraphQL<{ products: { list: ProductCardData[]; total: number } }>(
      GET_PRODUCTS_STR,
      { filter },
      0,
    ).catch(() => ({ products: { list: [], total: 0 } })),
    serverFetchGraphQL<{ categories: any[] }>(GET_CATEGORIES_STR, undefined, 0).catch(() => ({ categories: [] })),
  ]);

  const products = productsData.products.list ?? [];
  const total = productsData.products.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="container-app py-12">
      <Reveal>
        <h1 className="section-title">{dict.nav.shop}</h1>
      </Reveal>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <ShopFilters dict={dict} categories={categoriesData.categories ?? []} locale={locale} />

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-ink-900/50">
              {total} {locale === 'ru' ? 'товаров' : 'ta mahsulot'}
            </p>
            <SortDropdown dict={dict} />
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/15 py-24 text-center">
              <p className="text-sm text-ink-900/50">{dict.product.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i * 0.04, 0.3)}>
                  <ProductCard product={product} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
