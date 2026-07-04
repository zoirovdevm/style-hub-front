'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { LOGIN } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  const [login, { loading }] = useMutation(LOGIN);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      const { data } = await login({ variables: { input: values } });
      setSession(data.login);
      router.push(data.login.user.role === 'ADMIN' ? `/${locale}/admin` : `/${locale}`);
    } catch (e: any) {
      setError(e.message ?? 'Login xato');
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
        <h1 className="font-display text-2xl font-medium">{dict.auth.loginTitle}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.email}</label>
            <input
              type="email"
              {...register('email', { required: true })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.password}</label>
            <input
              type="password"
              {...register('password', { required: true })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '…' : dict.auth.loginButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-900/60">
          {dict.auth.noAccount}{' '}
          <Link href={`/${locale}/register`} className="font-semibold text-ink-950 underline">
            {dict.auth.createOne}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
