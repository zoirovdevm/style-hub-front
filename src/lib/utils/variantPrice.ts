// Mahsulotning TANLANGAN variant (o'lcham/rang) uchun haqiqiy narxi.
//
// NEGA KERAK: duxi hajm bo'yicha sotiladi va har bir hajmning o'z narxi
// bor (50ml — bir narx, 100ml — boshqa narx). Shuning uchun variantda
// alohida `price` maydoni paydo bo'ldi. Kiyim, poyabzal kabi narxi
// o'lchamga bog'liq bo'lmagan mahsulotlarda esa u bo'sh (null) qoladi va
// avvalgidek mahsulotning umumiy narxi ishlatiladi.
//
// MUHIM: bu faqat KO'RSATISH uchun. Buyurtmaning haqiqiy summasi baribir
// serverda, bazadagi qiymatlardan qaytadan hisoblanadi (order.service.ts)
// — brauzerdan kelgan narxga hech qachon ishonilmaydi.

export interface PricedVariant {
  size: string;
  color: string;
  price?: number | null;
}

export interface PricedProduct {
  price: number;
  variants?: PricedVariant[] | null;
}

// Tanlangan o'lcham/rang uchun variantni topadi. Variantlar jadvalida
// o'lcham yoki rang ishlatilmaydigan mahsulotlarda bo'sh satr ('')
// saqlanadi, shuning uchun taqqoslashda ham '' ishlatiladi.
export function findVariant(
  product: PricedProduct | null | undefined,
  size?: string | null,
  color?: string | null,
): PricedVariant | undefined {
  if (!product?.variants?.length) return undefined;
  return product.variants.find((v) => v.size === (size ?? '') && v.color === (color ?? ''));
}

export function resolveUnitPrice(
  product: PricedProduct | null | undefined,
  size?: string | null,
  color?: string | null,
): number {
  if (!product) return 0;
  const variant = findVariant(product, size, color);
  return variant?.price != null ? Number(variant.price) : Number(product.price);
}

// Mahsulot kartochkasi uchun: variantlar orasidagi ENG ARZON narx.
// Duxi ro'yxatda turganda "250 000 so'm" emas, eng kichik hajm narxini
// ko'rsatgan to'g'riroq — aks holda mahsulotning asosiy narxi tanlangan
// hajmga umuman mos kelmasligi mumkin. Variantlarda narx bo'lmasa,
// oddiy mahsulot narxi qaytadi.
export function resolveMinPrice(product: PricedProduct | null | undefined): number {
  if (!product) return 0;
  const prices = (product.variants ?? [])
    .map((v) => (v.price != null ? Number(v.price) : null))
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return Number(product.price);
  return Math.min(...prices);
}

// Variantlarning birortasida o'z narxi bormi — ya'ni bu mahsulotning
// narxi tanlovga qarab o'zgaradimi. Kartochkada "dan boshlab" kabi
// izoh ko'rsatish uchun ishlatiladi.
export function hasVariantPricing(product: PricedProduct | null | undefined): boolean {
  return (product?.variants ?? []).some((v) => v.price != null && Number(v.price) > 0);
}
