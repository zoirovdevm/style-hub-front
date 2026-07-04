'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Trash2 } from 'lucide-react';
import { GET_CATEGORIES, GET_BRANDS } from '@/lib/graphql/queries';
import { CREATE_CATEGORY, CREATE_BRAND } from '@/lib/graphql/mutations';
import { gql } from '@apollo/client';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

const REMOVE_CATEGORY = gql`
  mutation RemoveCategory($id: ID!) {
    removeCategory(id: $id)
  }
`;
const REMOVE_BRAND = gql`
  mutation RemoveBrand($id: ID!) {
    removeBrand(id: $id)
  }
`;

export default function AdminCategoriesPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;

  const { data: categoriesData, refetch: refetchCategories } = useQuery(GET_CATEGORIES);
  const { data: brandsData, refetch: refetchBrands } = useQuery(GET_BRANDS);

  const [createCategory] = useMutation(CREATE_CATEGORY);
  const [createBrand] = useMutation(CREATE_BRAND);
  const [removeCategory] = useMutation(REMOVE_CATEGORY);
  const [removeBrand] = useMutation(REMOVE_BRAND);

  const [categoryName, setCategoryName] = useState('');
  const [brandName, setBrandName] = useState('');

  async function handleAddCategory() {
    if (!categoryName.trim()) return;
    await createCategory({ variables: { input: { name: categoryName.trim() } } });
    setCategoryName('');
    refetchCategories();
  }

  async function handleAddBrand() {
    if (!brandName.trim()) return;
    await createBrand({ variables: { input: { name: brandName.trim() } } });
    setBrandName('');
    refetchBrands();
  }

  return (
    <div className="space-y-6">
      <h1 className="section-title">
        {dict.admin.categories} & {dict.admin.brands}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface space-y-4 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider">{dict.admin.categories}</h2>
          <div className="flex gap-2">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={dict.admin.categoryNamePlaceholder}
              className="flex-1 rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <button onClick={handleAddCategory} className="btn-primary !px-4">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {categoriesData?.categories?.map((cat: any) => (
              <div key={cat.id} className="flex items-center justify-between rounded-xl border border-ink-900/5 px-4 py-3 text-sm">
                <span>{cat.name}</span>
                <button
                  onClick={async () => {
                    await removeCategory({ variables: { id: cat.id } });
                    refetchCategories();
                  }}
                  className="text-ink-900/30 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface space-y-4 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider">{dict.admin.brands}</h2>
          <div className="flex gap-2">
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={dict.admin.brandNamePlaceholder}
              className="flex-1 rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <button onClick={handleAddBrand} className="btn-primary !px-4">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {brandsData?.brands?.map((brand: any) => (
              <div key={brand.id} className="flex items-center justify-between rounded-xl border border-ink-900/5 px-4 py-3 text-sm">
                <span>{brand.name}</span>
                <button
                  onClick={async () => {
                    await removeBrand({ variables: { id: brand.id } });
                    refetchBrands();
                  }}
                  className="text-ink-900/30 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
