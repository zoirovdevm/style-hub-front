'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { VERIFY_EMAIL, RESEND_VERIFICATION_CODE } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface CodeForm {
  code: string;
}

export default function VerifyEmailPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const setSession = useAuthStore((s) => s.setSession);

  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [verifyEmail, { loading }] = useMutation(VERIFY_EMAIL);
  const [resendCode, { loading: resending }] = useMutation(RESEND_VERIFICATION_CODE);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeForm>();

  async function onSubmit(values: CodeForm) {
    setError(null);
    try {
      const { data } = await verifyEmail({ variables: { input: { email, code: values.code } } });
      setSession(data.verifyEmail);
      router.push(data.verifyEmail.user.role === 'ADMIN' ? `/${locale}/admin` : `/${locale}`);
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e));
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    setResendMessage(null);
    try {
      await resendCode({ variables: { email } });
      setResendMessage(dict.auth.codeResent);
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(timer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e));
    }
  }

  if (!email) {
    return (
      <div className="container-app flex min-h-[70vh] items-center justify-center py-16 text-center text-sm text-ink-900/50">
        {dict.auth.verifyMissingEmail}
      </div>
    );
  }

  return (
    <div className="container-app flex min-h-[70vh] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-surface w-full max-w-md p-8"
      >
        <h1 className="font-display text-2xl font-medium">{dict.auth.verifyTitle}</h1>
        <p className="mt-2 text-sm text-ink-900/60">
          {dict.auth.verifySubtitle} <span className="font-semibold">{email}</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.codeLabel}</label>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              {...register('code', { required: true, minLength: 6, maxLength: 6 })}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-center text-lg font-bold tracking-[0.5em] outline-none focus:border-ink-950"
            />
            {errors.code && <p className="mt-1 text-xs text-red-500">{dict.auth.codeInvalidLength}</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {resendMessage && <p className="text-xs font-semibold text-emerald-600">{resendMessage}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '…' : dict.auth.verifyButton}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="btn-outline w-full disabled:opacity-50"
          >
            {resendCooldown > 0 ? `${dict.auth.resendButton} (${resendCooldown}s)` : dict.auth.resendButton}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
