'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { REGISTER } from '@/lib/graphql/mutations';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export default function RegisterPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [registerUser, { loading }] = useMutation(REGISTER);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  async function onSubmit(values: RegisterForm) {
    setError(null);
    try {
      const { data } = await registerUser({ variables: { input: values } });
      const params = new URLSearchParams({ email: data.register.email, phone: data.register.phone });
      router.push(`/${locale}/verify-email?${params.toString()}`);
    } catch (e: any) {
      setError(e.message ?? 'Ro‘yxatdan o‘tishda xatolik');
    }
  }

  return (
    <div className="container-app flex min-h-[70vh] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-surface w-full max-w-md p-8"
      >
        <h1 className="font-display text-2xl font-medium">{dict.auth.registerTitle}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.firstName}</label>
              <input
                {...register('firstName', { required: true })}
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
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.email}</label>
            <input
              type="email"
              {...register('email', { required: true })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.phone}</label>
            <input
              {...register('phone', { required: true, pattern: /^\+?998\s?\(?\d{2}\)?\s?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/ })}
              placeholder="+998 90 123 45 67"
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{dict.auth.phoneInvalid}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.password}</label>
            <input
              type="password"
              {...register('password', { required: true, minLength: 6 })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">Kamida 6 belgi</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '…' : dict.auth.registerButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-900/60">
          {dict.auth.haveAccount}{' '}
          <Link href={`/${locale}/login`} className="font-semibold text-ink-950 underline">
            {dict.auth.signIn}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
