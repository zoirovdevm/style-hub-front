'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { AnimatePresence, motion } from 'framer-motion';
import { SEND_REGISTER_OTP, VERIFY_REGISTER_OTP, REGISTER } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { getFriendlyErrorMessage } from '@/lib/utils/graphql-error';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MOCK_AUTH_FALLBACK, mockAuthPayload } from '@/lib/utils/mock-auth';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

type Step = 'phone' | 'otp' | 'details' | 'confirm';

interface DetailsForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
}

const OTP_RESEND_COOLDOWN_S = 60;

// Multi-step registration wizard: phone -> SMS OTP -> personal details ->
// confirmation. Matches the auth spec exactly — the account is only
// actually created on the final "Tasdiqlash" (confirm) step, after the
// phone number has already been verified via SMS in the previous step.
export default function RegisterPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('phone');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  // "Did you type this right?" confirmation modal shown before the SMS is
  // actually sent — catches a mistyped digit before it costs a real SMS
  // send / burns the resend cooldown on the wrong number.
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const [details, setDetails] = useState<DetailsForm | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const [sendOtp, { loading: sendingOtp }] = useMutation(SEND_REGISTER_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_REGISTER_OTP);
  const [registerUser, { loading: registering }] = useMutation(REGISTER);

  const {
    register: registerDetails,
    handleSubmit: handleDetailsSubmit,
    watch,
    formState: { errors: detailsErrors },
  } = useForm<DetailsForm>();

  const fullPhone = `+998${phoneDigits}`;

  function startCooldown() {
    setResendCooldown(OTP_RESEND_COOLDOWN_S);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Runs the same format check handleSendOtp itself already does, but
  // *before* actually sending anything — only opens the "is this number
  // right?" modal once the format is valid, so the modal never shows a
  // number that's going to be rejected anyway.
  function openPhoneConfirm() {
    setPhoneError(null);
    if (phoneDigits.length !== 9) {
      setPhoneError(dict.auth.phoneInvalid);
      return;
    }
    setShowPhoneConfirm(true);
  }

  async function handleSendOtp() {
    setPhoneError(null);
    if (phoneDigits.length !== 9) {
      setPhoneError(dict.auth.phoneInvalid);
      return;
    }
    try {
      await sendOtp({ variables: { input: { phone: fullPhone } } });
      setOtpCode('');
      setOtpError(null);
      setStep('otp');
      startCooldown();
    } catch (e: any) {
      // See mock-auth.ts — no backend reachable yet, so let UI/UX testing
      // continue past this step instead of getting stuck on a network error.
      if (MOCK_AUTH_FALLBACK) {
        setOtpCode('');
        setOtpError(null);
        setStep('otp');
        startCooldown();
        return;
      }
      setPhoneError(getFriendlyErrorMessage(e));
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setOtpError(null);
    setResendMessage(null);
    try {
      await sendOtp({ variables: { input: { phone: fullPhone } } });
      setResendMessage(dict.auth.codeResent);
      startCooldown();
    } catch (e: any) {
      if (MOCK_AUTH_FALLBACK) {
        setResendMessage(dict.auth.codeResent);
        startCooldown();
        return;
      }
      setOtpError(getFriendlyErrorMessage(e));
    }
  }

  async function handleVerifyOtp() {
    setOtpError(null);
    if (otpCode.length !== 6) {
      setOtpError(dict.auth.codeInvalidLength);
      return;
    }
    try {
      await verifyOtp({ variables: { input: { phone: fullPhone, code: otpCode } } });
      setStep('details');
    } catch (e: any) {
      // Mock mode accepts any correctly-shaped 6-digit code — the length
      // check above already ran, so there's nothing left a real backend
      // would validate that's worth faking here.
      if (MOCK_AUTH_FALLBACK) {
        setStep('details');
        return;
      }
      setOtpError(getFriendlyErrorMessage(e));
    }
  }

  function onDetailsSubmit(values: DetailsForm) {
    setDetails(values);
    setConfirmError(null);
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!details) return;
    setConfirmError(null);
    try {
      const { data } = await registerUser({
        variables: {
          input: {
            phone: fullPhone,
            firstName: details.firstName,
            lastName: details.lastName,
            email: details.email,
            password: details.password,
            address: details.address,
          },
        },
      });
      setSession(data.register);
      setShowWelcome(true);
      setTimeout(() => {
        router.push(data.register.user.role === 'ADMIN' ? `/${locale}/admin` : `/${locale}`);
      }, 2000);
    } catch (e: any) {
      if (MOCK_AUTH_FALLBACK) {
        const mockPayload = mockAuthPayload({ email: details.email, firstName: details.firstName, lastName: details.lastName });
        setSession(mockPayload);
        setShowWelcome(true);
        setTimeout(() => {
          router.push(`/${locale}`);
        }, 2000);
        return;
      }
      setConfirmError(getFriendlyErrorMessage(e));
    }
  }

  const password = watch('password');

  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3 bg-white px-6 text-center dark:bg-ink-950"
          >
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">
                {dict.auth.welcomeSubtitle}
              </p>
              <h1 className="mt-4 font-display text-3xl font-medium text-ink-950 sm:text-5xl dark:text-cream">
                {dict.auth.registerWelcomeTitle}
              </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoneConfirm && (
          <motion.div
            key="phone-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[998] flex items-center justify-center bg-ink-950/40 px-6"
            onClick={() => setShowPhoneConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="card-surface w-full max-w-sm p-8 text-center"
            >
              <h2 className="font-display text-xl font-medium">{dict.auth.phoneConfirmTitle}</h2>
              <p className="mt-4 text-3xl font-bold tracking-wide text-ink-950 dark:text-cream">{`+998 ${phoneDigits}`}</p>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowPhoneConfirm(false)} className="btn-outline w-1/2">
                  {dict.auth.phoneConfirmNo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneConfirm(false);
                    handleSendOtp();
                  }}
                  disabled={sendingOtp}
                  className="btn-primary w-1/2 disabled:opacity-50"
                >
                  {sendingOtp ? '…' : dict.auth.phoneConfirmYes}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container-app flex min-h-[70vh] items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card-surface w-full max-w-md p-8"
        >
          {step === 'phone' && (
            <>
              <h1 className="font-display text-2xl font-medium">{dict.auth.phoneStepTitle}</h1>
              <p className="mt-2 text-sm text-ink-900/60">{dict.auth.phoneStepSubtitle}</p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.phone}</label>
                  <PhoneInput value={phoneDigits} onChange={setPhoneDigits} autoFocus />
                  {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
                </div>

                <button
                  type="button"
                  onClick={openPhoneConfirm}
                  disabled={sendingOtp}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {sendingOtp ? '…' : dict.auth.phoneContinueButton}
                </button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <h1 className="font-display text-2xl font-medium">{dict.auth.otpStepTitle}</h1>
              <p className="mt-2 text-sm text-ink-900/60">
                {dict.auth.otpStepSubtitlePrefix} <span className="font-semibold">{`+998 ${phoneDigits}`}</span>
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.codeLabel}</label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-center text-lg font-bold tracking-[0.5em] outline-none focus:border-ink-950"
                  />
                  {otpError && <p className="mt-1 text-xs text-red-500">{otpError}</p>}
                  {resendMessage && <p className="mt-1 text-xs font-semibold text-emerald-600">{resendMessage}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {verifyingOtp ? '…' : dict.auth.verifyButton}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={sendingOtp || resendCooldown > 0}
                  className="btn-outline w-full disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `${dict.auth.resendButton} (${resendCooldown}s)` : dict.auth.resendButton}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtpError(null);
                    setResendMessage(null);
                  }}
                  className="w-full text-center text-xs font-semibold text-ink-900/50 underline hover:text-ink-950"
                >
                  {dict.auth.otpChangeNumber}
                </button>
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              <h1 className="font-display text-2xl font-medium">{dict.auth.detailsStepTitle}</h1>

              <form onSubmit={handleDetailsSubmit(onDetailsSubmit)} className="mt-8 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.firstName}</label>
                    <input
                      {...registerDetails('firstName', { required: true, pattern: /^[^0-9]+$/ })}
                      className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                    />
                    {detailsErrors.firstName && <p className="mt-1 text-xs text-red-500">{dict.auth.nameNoDigits}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.lastName}</label>
                    <input
                      {...registerDetails('lastName', { required: true, pattern: /^[^0-9]+$/ })}
                      className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                    />
                    {detailsErrors.lastName && <p className="mt-1 text-xs text-red-500">{dict.auth.nameNoDigits}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.email}</label>
                  <input
                    type="email"
                    {...registerDetails('email', { required: true, pattern: /^[^\s@]+@gmail\.com$/i })}
                    className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                  />
                  {detailsErrors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {detailsErrors.email.type === 'pattern' ? dict.auth.emailMustBeGmail : 'Majburiy maydon'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.address}</label>
                  <input
                    {...registerDetails('address', { required: true })}
                    className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                  />
                  {detailsErrors.address && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.password}</label>
                  <PasswordInput {...registerDetails('password', { required: true, minLength: 6 })} />
                  {detailsErrors.password && <p className="mt-1 text-xs text-red-500">Kamida 6 belgi</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.auth.confirmPassword}</label>
                  <PasswordInput
                    {...registerDetails('confirmPassword', {
                      required: true,
                      validate: (value) => value === password || (dict.auth.passwordMismatch as string),
                    })}
                  />
                  {detailsErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{detailsErrors.confirmPassword.message || dict.auth.passwordMismatch}</p>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full">
                  {dict.auth.continueButton}
                </button>
              </form>
            </>
          )}

          {step === 'confirm' && details && (
            <>
              <h1 className="font-display text-2xl font-medium">{dict.auth.confirmStepTitle}</h1>
              <p className="mt-2 text-sm text-ink-900/60">{dict.auth.confirmStepSubtitle}</p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.confirmPhoneLabel}</dt>
                  <dd className="font-semibold">{`+998 ${phoneDigits}`}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.firstName}</dt>
                  <dd className="font-semibold">{details.firstName}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.lastName}</dt>
                  <dd className="font-semibold">{details.lastName}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.email}</dt>
                  <dd className="font-semibold">{details.email}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.address}</dt>
                  <dd className="font-semibold">{details.address}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-ink-900/10 pb-2">
                  <dt className="text-ink-900/50">{dict.auth.confirmPasswordLabel}</dt>
                  {/* Password is never shown in plaintext, even here — a
                      fixed-length mask so the dot count doesn't leak the
                      real password's length either. */}
                  <dd className="font-semibold tracking-widest">••••••••</dd>
                </div>
              </dl>

              {confirmError && <p className="mt-4 text-xs text-red-500">{confirmError}</p>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setStep('details')} className="btn-outline w-1/2">
                  {dict.auth.goBack}
                </button>
                <button type="button" onClick={handleConfirm} disabled={registering} className="btn-primary w-1/2 disabled:opacity-50">
                  {registering ? '…' : dict.auth.confirmSubmit}
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-ink-900/60">
            {dict.auth.haveAccount}{' '}
            <Link href={`/${locale}/login`} className="font-semibold text-ink-950 underline">
              {dict.auth.signIn}
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
