'use client';

import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { GET_PRODUCTS } from '@/lib/graphql/queries';
import { REMOVE_PRODUCT } from '@/lib/graphql/mutations';
import { formatPrice } from '@/lib/utils/format';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

export default function AdminProductsPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;

  const { data, loading, refetch } = useQuery(GET_PRODUCTS, {
    variables: { filter: { page: 1, limit: 100, sort: 'NEWEST' } },
  });
  const [removeProduct] = useMutation(REMOVE_PRODUCT);

  const products = data?.products?.list ?? [];

  async function handleDelete(id: string) {
    if (!confirm(dict.admin.delete + '?')) return;
    await removeProduct({ variables: { id } });
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title">{dict.admin.products}</h1>
        <Link href={`/${locale}/admin/products/new`} className="btn-primary">
          <Plus size={16} />
          {dict.admin.addProduct}
        </Link>
      </div>

      <div className="card-surface overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wider text-ink-900/40">
              <th className="px-5 py-4">{dict.admin.productName}</th>
              <th className="px-5 py-4">{dict.product.category}</th>
              <th className="px-5 py-4">{dict.admin.price}</th>
              <th className="px-5 py-4">{dict.admin.stock}</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {!loading &&
              products.map((p: any) => (
                <tr key={p.id} className="border-b border-ink-900/5 last:border-0">
                  <td className="max-w-[220px] truncate px-5 py-4 font-medium">{p.title}</td>
                  <td className="px-5 py-4 text-ink-900/60">{p.category?.name}</td>
                  <td className="px-5 py-4 font-semibold">{formatPrice(p.price, locale)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/products/${p.id}/edit`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-900/10 hover:border-ink-950"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-900/10 text-red-500 hover:border-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && <p className="p-8 text-center text-sm text-ink-900/40">{dict.product.noResults}</p>}
      </div>
    </div>
  );
}
