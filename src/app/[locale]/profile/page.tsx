'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { User2 } from 'lucide-react';
import { GET_ME } from '@/lib/graphql/queries';
import { UPDATE_PROFILE } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
}

export default function ProfilePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery(GET_ME, { skip: !user });
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  const { register, handleSubmit, reset } = useForm<ProfileForm>();

  useEffect(() => {
    if (data?.me) {
      reset({ firstName: data.me.firstName, lastName: data.me.lastName ?? '', phone: data.me.phone ?? '' });
    }
  }, [data, reset]);

  if (!user) {
    return (
      <div className="container-app flex flex-col items-center py-32 text-center">
        <User2 size={40} className="text-ink-900/20" />
        <Link href={`/${locale}/login`} className="btn-primary mt-6">
          {dict.nav.login}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-12">
      <Reveal>
        <h1 className="section-title">{dict.profile.title}</h1>
      </Reveal>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <form
            onSubmit={handleSubmit((values) => updateProfile({ variables: { input: values } }))}
            className="card-surface space-y-5 p-6"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider">{dict.profile.personalInfo}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.firstName}</label>
                <input
                  {...register('firstName')}
                  className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.lastName}</label>
                <input
                  {...register('lastName')}
                  className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.phone}</label>
              <input
                {...register('phone')}
                className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.email}</label>
              <input
                disabled
                value={data?.me?.email ?? user.email}
                className="w-full rounded-xl border border-ink-900/10 bg-ink-900/5 px-4 py-3 text-sm text-ink-900/50 outline-none"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? '…' : dict.profile.save}
            </button>
          </form>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card-surface space-y-4 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-950 text-xl font-display font-semibold text-cream">
              {user.firstName?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-ink-900/50">{user.email}</p>
            </div>
            <Link href={`/${locale}/orders`} className="btn-outline w-full">
              {dict.profile.myOrders}
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
