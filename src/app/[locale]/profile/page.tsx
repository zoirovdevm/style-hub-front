'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { User2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
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
  address: string;
}

export default function ProfilePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  function handleLogout() {
    clearSession();
    router.push(`/${locale}`);
  }

  const { data, loading: meLoading } = useQuery(GET_ME, { skip: !user });
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);

  const { register, handleSubmit, reset } = useForm<ProfileForm>();

  useEffect(() => {
    if (data?.me) {
      reset({
        firstName: data.me.firstName,
        lastName: data.me.lastName ?? '',
        phone: data.me.phone ?? '',
        address: data.me.address ?? '',
      });
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

  // First load only — without this the form fields briefly render empty
  // (default `useForm` state) until the `useEffect` below resets them once
  // `data.me` arrives.
  if (meLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  return (
    <div className="container-app py-12">
      {/* Language/theme now live directly in the header (visible on every
          screen size) — mobile no longer has a hamburger menu, but those
          two are small enough to fit the header itself. Admin link and
          logout stay here since they're needed less often, one tap away
          via the bottom nav's Profile tab. */}
      <Reveal>
        <div className="card-surface flex flex-wrap items-center justify-end gap-3 p-4">
          {user.role === 'ADMIN' && (
            <Link href={`/${locale}/admin`} className="btn-outline flex items-center gap-2 !px-4 !py-2 text-xs">
              <ShieldCheck size={16} />
              {dict.nav.admin}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-ink-900/60 hover:text-ink-950 dark:text-cream/60 dark:hover:text-cream"
          >
            <LogOut size={16} />
            {dict.nav.logout}
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.05} className="mt-8">
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
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.address}</label>
              <input
                {...register('address')}
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
