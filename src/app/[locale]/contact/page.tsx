'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

export default function ContactPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, reset } = useForm<ContactForm>();

  function onSubmit() {
    setSent(true);
    reset();
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className="container-app py-16">
      <Reveal>
        <h1 className="section-title">{dict.contact.title}</h1>
        <p className="mt-3 max-w-lg text-sm text-ink-900/60">{dict.contact.subtitle}</p>
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        <Reveal delay={0.1} className="space-y-6">
          {[
            { icon: MapPin, label: "Jizzax shahar, Madaniyat mahallasi, Ogahiy ko'chasi, 2-uy", href: undefined },
            { icon: Phone, label: '+998 (97) 521-31-30', href: 'tel:+998975213130' },
            { icon: Send, label: '@MZ0526 (Telegram)', href: 'https://t.me/MZ0526' },
            { icon: Mail, label: 'hello@stylehub.uz', href: 'mailto:hello@stylehub.uz' },
          ].map((item) =>
            item.href ? (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 hover:text-gold-600"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-950 text-gold-400">
                  <item.icon size={16} />
                </div>
                <span className="text-sm">{item.label}</span>
              </a>
            ) : (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-950 text-gold-400">
                  <item.icon size={16} />
                </div>
                <span className="text-sm">{item.label}</span>
              </div>
            ),
          )}
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card-surface space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                {...register('name', { required: true })}
                placeholder={dict.contact.name}
                className="rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
              <input
                {...register('email', { required: true })}
                type="email"
                placeholder={dict.auth.email}
                className="rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
              />
            </div>
            <textarea
              {...register('message', { required: true })}
              rows={5}
              placeholder={dict.contact.message}
              className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
            />
            <button type="submit" className="btn-primary">
              {dict.contact.send}
            </button>
            {sent && <p className="text-xs font-semibold text-emerald-600">✓ Xabar yuborildi</p>}
          </form>
        </Reveal>
      </div>
    </div>
  );
}
