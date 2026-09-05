'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@apollo/client';
import { Check, Copy, Send, X, Pencil } from 'lucide-react';
import { GET_MY_CART, GET_MY_ORDERS, GET_ME } from '@/lib/graphql/queries';
import { CREATE_ORDER } from '@/lib/graphql/mutations';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatPrice } from '@/lib/utils/format';
import { translateColorName } from '@/lib/utils/colorNames';
import { Reveal } from '@/components/ui/Reveal';
import type { Locale } from '@/i18n/config';
import uzDict from '@/i18n/dictionaries/uz.json';
import ruDict from '@/i18n/dictionaries/ru.json';

interface CheckoutForm {
  deliveryAddress: string;
  deliveryCity: string;
  phone: string;
  note: string;
}

// Real Click/Payme merchant credentials aren't configured yet, so payment is
// coordinated manually: the buyer transfers to this card and sends the
// receipt via Telegram. Centralized here since it's shown both after order
// placement and could be reused elsewhere.
const PAYMENT_CARD_NUMBER = '4073 4200 2305 8815';
const PAYMENT_CARD_HOLDER = 'Muhammadjon Zoirov';

// `placedOrder` below is plain component state, so it's normally lost the
// moment this component remounts — e.g. a locale switch, or (very commonly
// on mobile) the browser discarding this background tab while the buyer is
// away in the Telegram app and reloading it when they come back. Mirroring
// it here lets a fresh mount restore the payment-confirmation screen instead
// of silently dropping the buyer back onto a blank checkout form.
const PLACED_ORDER_STORAGE_KEY = 'checkout:lastPlacedOrder';
// Written by QuickBuyModal.tsx / ProductActions.tsx right before they
// navigate here with `?buyNow=1` — carries exactly the product/size/color/
// quantity the buyer picked, so this page can order that directly via
// CreateOrderInput's buyNowProductId (see order.service.ts) instead of
// routing through the cart. Bypassing the cart entirely (rather than
// addToCart-then-?items=<row>) is deliberate: CartService.add() increments
// an EXISTING matching cart row instead of creating a second one, so a
// "buy now" of 1 unit used to silently become "3" whenever 2 of that exact
// same size/color were already sitting in the cart for later.
const BUY_NOW_ITEM_STORAGE_KEY = 'checkout:buyNowItem';
// Yetkazib berish manzili/shahar/telefon — muvaffaqiyatli buyurtmadan
// keyin shu kalit bilan saqlanadi (pastdagi onSubmit'ga qarang) va
// xaridor keyingi safar checkout sahifasiga kelganda formaga qaytarib
// to'ldiriladi, har safar qayta qo'lda yozmasin deb. Birinchi buyurtma —
// ya'ni bu kalit hali bo'sh bo'lganda — pastdagi effekt buning o'rniga
// xaridor ro'yxatdan o'tishda kiritgan manzil/telefonni (GET_ME so'rovi
// orqali) ishlatadi, shunda hech qachon bo'sh forma bilan boshlanmaydi.
const SAVED_DELIVERY_INFO_KEY = 'checkout:savedDeliveryInfo';
// Falls back to the admin's personal account if the bot isn't configured
// yet (NEXT_PUBLIC_TELEGRAM_BOT_USERNAME empty in .env.local) — otherwise
// deep-links straight into the bot with ?start=order_<id>, so the bot can
// bind the buyer's chat to this exact order automatically.
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
const TELEGRAM_FALLBACK_USERNAME = 'MZ0526';

// useSearchParams() opts the calling component out of static prerendering
// unless it's wrapped in <Suspense> — without this wrapper `next build`
// fails with "useSearchParams() should be wrapped in a suspense boundary"
// (same fix already applied to the verify-email page for the same reason).
export default function CheckoutPage({ params }: { params: { locale: Locale } }) {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner params={params} />
    </Suspense>
  );
}

function CheckoutPageInner({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = locale === 'ru' ? ruDict : uzDict;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // zustand's persist middleware reads localStorage asynchronously — right
  // after a fresh mount `user` is still `null` for one tick even when a
  // valid session exists. Gating the login-redirect effect on this (instead
  // of just `!user`) stops a still-logged-in buyer from being bounced to
  // /login the instant this page remounts.
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNumber: string; totalAmount: number; buyNow?: boolean } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // ?items=id1,id2 — set by the cart page when the buyer checked out only
  // some of their cart, not the whole thing (its checkbox selection). Absent
  // entirely (checkout reached with nothing selected) means "the whole
  // cart", exactly like before this existed.
  const searchParams = useSearchParams();
  const itemsParam = searchParams.get('items');
  const selectedItemIds = useMemo(
    () => (itemsParam ? itemsParam.split(',').filter(Boolean) : null),
    [itemsParam],
  );

  // ?buyNow=1 — set by QuickBuyModal.tsx / ProductActions.tsx. Synchronous
  // from the URL (unlike buyNowItem below, which needs an effect to reach
  // sessionStorage), so it's safe to use immediately for gating the cart
  // query/loading state without a one-frame flicker.
  const buyNowRequested = searchParams.get('buyNow') === '1';
  const [buyNowItem, setBuyNowItem] = useState<{
    productId: string;
    title: string;
    price: number;
    size?: string;
    color?: string;
    quantity: number;
  } | null>(null);

  // Populates buyNowItem from sessionStorage once, on mount — see
  // BUY_NOW_ITEM_STORAGE_KEY above for why this bypasses the cart entirely.
  useEffect(() => {
    if (!buyNowRequested) return;
    try {
      const raw = sessionStorage.getItem(BUY_NOW_ITEM_STORAGE_KEY);
      if (raw) setBuyNowItem(JSON.parse(raw));
    } catch {
      // sessionStorage can throw in some privacy modes — the buyer just
      // won't see their buy-now item here and can go back and retry.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skips the cart fetch entirely during a buy-now checkout — this page
  // never needs the buyer's actual cart contents in that mode.
  const { data, loading: cartLoading } = useQuery(GET_MY_CART, { skip: !user || buyNowRequested });

  // Ro'yxatdan o'tishda kiritilgan manzil/telefonni olish uchun — pastdagi
  // effekt buyerning birinchi buyurtmasida (hali SAVED_DELIVERY_INFO_KEY
  // bo'sh bo'lganda) shulardan foydalanadi, forma bo'sh boshlanmasin deb.
  const { data: meData, loading: meLoading } = useQuery(GET_ME, { skip: !user });

  // Once an order is placed, keep polling the buyer's own orders so this
  // screen can reflect what actually happened to the receipt (admin
  // confirms/rejects it, on the site or via the Telegram bot) — without
  // this, returning to the site after sending a payment kept showing the
  // exact same "here's the card number, send your receipt" screen forever,
  // no matter what the admin had already done with it. `network-only` +
  // polling (not the cache) so a status the admin just changed always shows
  // up, same reasoning as the /orders page's own query.
  const { data: ordersData } = useQuery(GET_MY_ORDERS, {
    skip: !placedOrder,
    pollInterval: 4000,
    fetchPolicy: 'network-only',
  });
  const livePaymentStatus: 'PENDING' | 'PAID' | 'FAILED' =
    ordersData?.myOrders?.find((o: any) => o.id === placedOrder?.id)?.paymentStatus ?? 'PENDING';
  const allCartItems = data?.myCart ?? [];
  // Synthesizes the same `{ id, quantity, size, color, product: { title,
  // price } }` shape the summary/subtotal code below already expects from
  // real cart rows, so neither has to branch on buy-now vs. cart mode.
  const items = buyNowRequested
    ? buyNowItem
      ? [
          {
            id: 'buy-now-item',
            quantity: buyNowItem.quantity,
            size: buyNowItem.size,
            color: buyNowItem.color,
            product: { title: buyNowItem.title, price: buyNowItem.price },
          },
        ]
      : []
    : selectedItemIds
      ? allCartItems.filter((i: any) => selectedItemIds.includes(i.id))
      : allCartItems;
  const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.product.price) * i.quantity, 0);

  // createOrder deletes the user's cart items server-side, but that doesn't
  // touch Apollo's client cache — without this, the cart page/badge kept
  // showing the just-purchased items as if checkout had done nothing.
  const [createOrder] = useMutation(CREATE_ORDER, {
    refetchQueries: [{ query: GET_MY_CART }],
    awaitRefetchQueries: true,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({ defaultValues: { phone: '+998 ' } });

  // Yetkazib berish ma'lumotlari topilgach forma "ko'rish" (read-only
  // xulosa + qalam tugmasi) rejimida ochiladi — xaridor har safar bo'sh
  // formani qayta to'ldirmasin deb. Hali hech qanday manzil topilmagan
  // holatda (masalan GET_ME hali javob bermagan, yoki chindan ham bo'sh)
  // to'g'ridan-to'g'ri tahrirlash formasi ko'rsatiladi.
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryPrefillReady, setDeliveryPrefillReady] = useState(false);

  // Manzil/shahar/telefonni formaga qaytarib to'ldirish — ustunlik
  // tartibi: (1) oldingi muvaffaqiyatli buyurtmadan qolgan aniq ma'lumot
  // (pastdagi onSubmit shuni saqlaydi — masalan boshqa shaharga yetkazib
  // berish so'ralgan bo'lishi mumkin), (2) hech qanday oldingi buyurtma
  // bo'lmasa — ro'yxatdan o'tishda kiritilgan manzil/telefon (GET_ME).
  // useEffect ichida — localStorage faqat brauzerda mavjud, server-side
  // render paytida bu componentning o'zi ham bir marta serverda ishlaydi
  // (bu "use client" bo'lsa ham), shu sababli localStorage'ga to'g'ridan-
  // to'g'ri render vaqtida emas, faqat mount bo'lgandan keyin murojaat
  // qilinadi. Faqat bir marta ishlaydi (topilgach — yoki GET_ME hali
  // yuklanayotgan bo'lsa, u tugagach) — xaridor formani qo'lda o'zgartirsa,
  // bu effekt qayta ishga tushib uni bosib ketmaydi.
  useEffect(() => {
    if (deliveryPrefillReady) return;
    try {
      const raw = localStorage.getItem(SAVED_DELIVERY_INFO_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CheckoutForm>;
        reset((current) => ({ ...current, ...saved }));
        setDeliveryPrefillReady(true);
        return;
      }
    } catch {
      // localStorage o'qishda xato bo'lsa (masalan maxfiy rejim) — pastga
      // o'tib, GET_ME'dan foydalanishga harakat qilinadi.
    }
    // Oldingi buyurtma topilmadi — GET_ME hali yuklanayotgan bo'lsa kutamiz
    // (aks holda profil ma'lumoti kelishidan oldin bo'sh forma "tayyor" deb
    // belgilanib qolardi), keyin ro'yxatdan o'tishdagi manzil/telefonni
    // ishlatamiz.
    if (!user || meLoading) return;
    const profile = meData?.me;
    if (profile?.address || profile?.phone) {
      reset((current) => ({
        ...current,
        ...(profile.address ? { deliveryAddress: profile.address } : {}),
        ...(profile.phone ? { phone: profile.phone } : {}),
      }));
    }
    setDeliveryPrefillReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryPrefillReady, meLoading, meData, user]);

  // Forma tayyor bo'lgach: agar manzil topilgan bo'lsa "ko'rish" rejimida
  // boshlanadi (qalam bosilsa tahrirlashga o'tadi); hech narsa topilmasa
  // (yangi profil, GET_ME bo'sh qaytdi) to'g'ridan-to'g'ri tahrirlash
  // formasi ochiladi — bo'sh xulosa ko'rsatishning ma'nosi yo'q.
  useEffect(() => {
    if (!deliveryPrefillReady) return;
    if (!watch('deliveryAddress')) setEditingDelivery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryPrefillReady]);

  // Real Click/Payme merchant credentials aren't set up yet, so online
  // payment selection is hidden — every order goes through as "to be
  // arranged", and payment itself is coordinated manually via Telegram
  // (see the contact note rendered below).
  async function onSubmit(values: CheckoutForm) {
    if (buyNowRequested && !buyNowItem) {
      // Sessionstorage read failed or was cleared (private-browsing mode,
      // or the buyer opened this URL fresh without going through the
      // buy-now buttons) — nothing to actually order. The submit button is
      // already disabled in this state (items.length === 0), but this
      // guards onSubmit directly too.
      setError(dict.checkout.buyNowMissing);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: orderData } = await createOrder({
        variables: {
          input: buyNowRequested
            ? {
                deliveryAddress: values.deliveryAddress,
                deliveryCity: values.deliveryCity,
                phone: values.phone,
                note: values.note,
                paymentMethod: 'CASH',
                buyNowProductId: buyNowItem!.productId,
                buyNowSize: buyNowItem!.size,
                buyNowColor: buyNowItem!.color,
                buyNowQuantity: buyNowItem!.quantity,
              }
            : {
                deliveryAddress: values.deliveryAddress,
                deliveryCity: values.deliveryCity,
                phone: values.phone,
                note: values.note,
                paymentMethod: 'CASH',
                // undefined (not []) when nothing was pre-selected, so the
                // backend's own "omitted = whole cart" fallback applies.
                itemIds: selectedItemIds ?? undefined,
              },
        },
      });

      // Stay on this page and show the payment card + Telegram instructions
      // instead of redirecting straight to /orders — the buyer needs those
      // details to actually send the payment.
      const order = {
        id: orderData?.createOrder?.id ?? '',
        orderNumber: orderData?.createOrder?.orderNumber ?? '',
        totalAmount: orderData?.createOrder?.totalAmount ?? 0,
        buyNow: buyNowRequested,
      };
      setPlacedOrder(order);
      try {
        sessionStorage.setItem(PLACED_ORDER_STORAGE_KEY, JSON.stringify(order));
        if (buyNowRequested) sessionStorage.removeItem(BUY_NOW_ITEM_STORAGE_KEY);
      } catch {
        // sessionStorage can throw in some privacy modes — safe to ignore.
      }
      // Keyingi safar checkout'ga qaytganda formani avtomatik to'ldirish
      // uchun — yuqoridagi useEffect shuni o'qiydi.
      try {
        localStorage.setItem(
          SAVED_DELIVERY_INFO_KEY,
          JSON.stringify({
            deliveryAddress: values.deliveryAddress,
            deliveryCity: values.deliveryCity,
            phone: values.phone,
          }),
        );
      } catch {
        // localStorage yozishda xato bo'lsa (masalan maxfiy rejim) —
        // buyurtmaning o'zi baribir muvaffaqiyatli joylashtirilgan, shuning
        // uchun bu yerda xato ko'rsatilmaydi, faqat eslab qolish ishlamaydi.
      }
    } catch (e: any) {
      setError(e.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  // Restore the payment-confirmation screen after a remount (see the
  // `PLACED_ORDER_STORAGE_KEY` note above). Only restores while the cart is
  // confirmed empty — that's the state right after a real order was placed.
  // If the buyer has since added new items (a genuinely new checkout), the
  // cart won't be empty, so we drop the stale entry and show the form
  // instead of re-showing a finished order's payment details.
  useEffect(() => {
    if (placedOrder) return;
    try {
      const raw = sessionStorage.getItem(PLACED_ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // A buy-now order never touched the cart, so there's no "cart is
      // empty" signal to gate on the way the cart-checkout branch below
      // does — the stored record itself is the only signal, and
      // BUY_NOW_ITEM_STORAGE_KEY was already cleared the moment this order
      // was placed, so this can't loop back into re-ordering it.
      if (parsed.buyNow) {
        setPlacedOrder(parsed);
        return;
      }
      if (cartLoading) return;
      if (items.length === 0) {
        setPlacedOrder(parsed);
      } else {
        sessionStorage.removeItem(PLACED_ORDER_STORAGE_KEY);
      }
    } catch {
      // sessionStorage can throw in some privacy modes — safe to ignore.
    }
  }, [cartLoading, items.length, placedOrder]);

  function copyCardNumber() {
    navigator.clipboard.writeText(PAYMENT_CARD_NUMBER.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Redirecting here must happen in an effect, not directly in the render
  // body — calling router.push() synchronously during render can run while
  // Next.js is statically prerendering this page (no browser `location`
  // global exists then), which throws "ReferenceError: location is not
  // defined" and fails `next build`.
  useEffect(() => {
    if (hasHydrated && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, hasHydrated, locale, router]);

  // While the session is still rehydrating from storage we don't yet know
  // whether the buyer is logged in — showing the same loading spinner as the
  // cart-loading case below avoids a false "not logged in" flash/redirect.
  if (!hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // First load only — without this the order summary briefly showed "0
  // items" / an empty list and a clickable-looking submit button before the
  // cart had actually loaded.
  if (cartLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-ink-950" />
      </div>
    );
  }

  // With the bot configured, `?start=order_<id>` deep-links straight into
  // it — the bot then knows exactly which order this chat belongs to the
  // moment the buyer opens it (see TelegramService.bot.start() on the
  // backend), so screenshots get matched automatically with no manual
  // order-number typing needed. Falls back to the old pre-filled-text link
  // to the admin's personal account if the bot isn't set up yet.
  const telegramHref = TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=order_${placedOrder?.id ?? ''}`
    : (() => {
        const telegramText = placedOrder
          ? `${dict.orders.orderNumber}: ${placedOrder.orderNumber}\n${dict.orders.total}: ${formatPrice(placedOrder.totalAmount, locale)}\n${dict.checkout.telegramReceiptMessage}`
          : '';
        return `https://t.me/${TELEGRAM_FALLBACK_USERNAME}?text=${encodeURIComponent(telegramText)}`;
      })();

  if (placedOrder) {
    const goToOrdersButton = (
      <button
        onClick={() => {
          try {
            sessionStorage.removeItem(PLACED_ORDER_STORAGE_KEY);
          } catch {
            // sessionStorage can throw in some privacy modes — safe to ignore.
          }
          router.push(`/${locale}/orders`);
        }}
        className="btn-outline w-full"
      >
        {dict.checkout.goToOrders}
      </button>
    );

    // Confirmed — the card/Telegram instructions are no longer needed, so
    // this replaces them entirely with a plain success state instead of
    // leaving a "still waiting for payment" screen up after payment is
    // already done.
    if (livePaymentStatus === 'PAID') {
      return (
        <div className="container-app py-20">
          <Reveal>
            <div className="mx-auto max-w-md card-surface space-y-5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Check size={28} strokeWidth={3} />
              </div>
              <h1 className="font-display text-2xl font-medium">{dict.checkout.paymentConfirmedTitle}</h1>
              <p className="text-sm text-ink-900/60 dark:text-cream/60">{dict.checkout.paymentConfirmedBody}</p>
              <p className="text-xs text-ink-900/50">
                {dict.checkout.orderPlacedSubtitle}: <span className="font-mono font-semibold">{placedOrder.orderNumber}</span>
              </p>
              {goToOrdersButton}
            </div>
          </Reveal>
        </div>
      );
    }

    // Rejected — keeps the card/Telegram instructions below the rejection
    // notice (rather than replacing them) so the buyer can immediately
    // retry with a corrected screenshot without hunting for the card number
    // again.
    const rejected = livePaymentStatus === 'FAILED';

    return (
      <div className="container-app py-20">
        <Reveal>
          <div className="mx-auto max-w-md card-surface space-y-5 p-8 text-center">
            {rejected ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                  <X size={28} strokeWidth={3} />
                </div>
                <h1 className="font-display text-2xl font-medium">{dict.checkout.paymentRejectedTitle}</h1>
                <p className="text-sm text-ink-900/60 dark:text-cream/60">{dict.checkout.paymentRejectedBody}</p>
              </>
            ) : (
              <h1 className="font-display text-2xl font-medium">{dict.checkout.orderPlacedTitle}</h1>
            )}
            <p className="text-xs text-ink-900/50">
              {dict.checkout.orderPlacedSubtitle}: <span className="font-mono font-semibold">{placedOrder.orderNumber}</span>
            </p>

            <div className="space-y-3 rounded-xl border border-ink-900/10 bg-ink-900/[0.03] p-5 text-left dark:border-cream/10 dark:bg-cream/5">
              <p className="text-sm text-ink-900/70 dark:text-cream/70">{dict.checkout.paymentCardInstructions}</p>
              <button
                onClick={copyCardNumber}
                className="flex w-full items-center justify-between rounded-lg border border-ink-900/15 bg-white px-4 py-3 font-mono text-base font-bold dark:border-cream/15 dark:bg-ink-800 dark:text-cream"
              >
                <span>{PAYMENT_CARD_NUMBER}</span>
                <Copy size={16} className="text-ink-900/40" />
              </button>
              {copied && <p className="text-xs font-semibold text-emerald-600">✓</p>}
              <p className="text-xs text-ink-900/50 dark:text-cream/50">
                {dict.checkout.cardHolder}: <span className="font-semibold">{PAYMENT_CARD_HOLDER}</span>
              </p>
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Send size={16} />
                {dict.checkout.sendReceiptTelegram}
              </a>
            </div>

            {goToOrdersButton}
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-app py-12">
      <Reveal>
        <h1 className="section-title">{dict.checkout.title}</h1>
      </Reveal>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Reveal>
            <div className="card-surface space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider">{dict.checkout.deliveryInfo}</h2>
                {/* Ma'lumot allaqachon topilgan bo'lsa (oldingi buyurtma
                    yoki ro'yxatdan o'tishdagi manzil/telefon) — qalam
                    tugmasi tahrirlash formasini ochadi/yopadi. Hech narsa
                    topilmasa (editingDelivery effekt orqali avtomatik true
                    bo'ladi) bu tugma umuman ko'rsatilmaydi, chunki forma
                    allaqachon ochiq. */}
                {deliveryPrefillReady && watch('deliveryAddress') && (
                  <button
                    type="button"
                    onClick={() => setEditingDelivery((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-ink-900/50 hover:text-ink-950 dark:text-cream/50 dark:hover:text-cream"
                  >
                    {editingDelivery ? (
                      dict.checkout.doneEditingDelivery
                    ) : (
                      <>
                        <Pencil size={13} />
                        {dict.checkout.editDeliveryInfo}
                      </>
                    )}
                  </button>
                )}
              </div>

              {editingDelivery ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.address}</label>
                    <input
                      {...register('deliveryAddress', { required: true, minLength: 5 })}
                      className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                    />
                    {errors.deliveryAddress && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.city}</label>
                      <input
                        {...register('deliveryCity')}
                        className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.phone}</label>
                      <input
                        {...register('phone', { required: true })}
                        placeholder="+998 90 123 45 67"
                        className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-500">Majburiy maydon</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-900/60">{dict.checkout.note}</label>
                    <textarea
                      {...register('note')}
                      rows={3}
                      className="w-full rounded-xl border border-ink-900/15 px-4 py-3 text-sm outline-none focus:border-ink-950"
                    />
                  </div>
                </>
              ) : (
                // Ko'rish rejimi — ro'yxatdan o'tishda yoki oldingi
                // buyurtmada berilgan ma'lumot qayta so'ralmaydi, faqat
                // ko'rsatiladi. Qiymatlar baribir register() qilingan
                // maydonlarda saqlanadi (hidden emas, shunchaki
                // ko'rsatilmayapti), shuning uchun submit ularni to'liq
                // yuboradi.
                <div className="space-y-1 text-sm text-ink-900/70 dark:text-cream/70">
                  <p>{watch('deliveryAddress')}</p>
                  {watch('deliveryCity') && <p>{watch('deliveryCity')}</p>}
                  <p>{watch('phone')}</p>
                  {watch('note') && <p className="text-ink-900/50 dark:text-cream/50">{watch('note')}</p>}
                </div>
              )}
            </div>
          </Reveal>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <Reveal delay={0.15}>
          <div className="card-surface sticky top-28 space-y-4 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">{dict.checkout.orderSummary}</h2>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between gap-2 text-xs text-ink-900/60">
                  <span className="max-w-[70%]">
                    <span className="block truncate">
                      {item.product.title} × {item.quantity}
                    </span>
                    {(item.size || item.color) && (
                      <span className="text-ink-900/40">
                        {[item.size, item.color ? translateColorName(item.color, locale) : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{formatPrice(item.product.price * item.quantity, locale)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-900/10 pt-4 text-base font-bold">
              <span>{dict.cart.total}</span>
              <span>{formatPrice(subtotal, locale)}</span>
            </div>
            <button type="submit" disabled={submitting || items.length === 0} className="btn-primary w-full disabled:opacity-50">
              {submitting ? '…' : dict.checkout.placeOrder}
            </button>
          </div>
        </Reveal>
      </form>
    </div>
  );
}
