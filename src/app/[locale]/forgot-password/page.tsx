'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { REQUEST_PASSWORD_RESET } from '@/lib/graphql/mutations';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>();

  async function onSubmit(values: ForgotForm) {
    setError(null);
    try {
      const { data } = await requestReset({ variables: { input: values } });
      const params = new URLSearchParams({ email: data.requestPasswordReset.email });
      router.push(`/${locale}/reset-password?${params.toString()}`);
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e));
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
        <h1 className="font-display text-2xl font-medium">{dict.auth.forgotTitle}</h1>
        <p className="mt-2 text-sm text-ink-900/60">{dict.auth.forgotSubtitle}</p>

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

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '…' : dict.auth.forgotButton}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-900/60">
          <Link href={`/${locale}/login`} className="font-semibold text-ink-950 underline">
            {dict.auth.backToLogin}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
