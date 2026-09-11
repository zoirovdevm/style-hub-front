// Kategoriya → qaysi o'lcham turi: BITTA manba, ikkala joyda ishlatiladi —
// do'kon filtri (components/shop/ShopFilters.tsx) va admin panelning
// mahsulot formasi (components/admin/ProductForm.tsx). Avval ikkalasida
// ALOHIDA nusxa bor edi va ular bir-biridan farqlanib ketgan: admin
// "o'lchamsiz" toifani (aksessuar/kosmetika) bilar, do'kon filtri esa
// bilmas edi — natijada "Aksessuarlar" tanlanganda ham do'konda XS-XXL
// chiqib turardi; ro'yxatlar ham mos emas edi (adminda XXXL bor, filtrda
// yo'q). Endi ikkalasi shu faylni o'qiydi, shuning uchun bir joyda
// o'zgartirilsa hamma joyda birdek o'zgaradi.
//
// Category modelida "bu poyabzal/aksessuar" degan aniq belgi yo'q, shuning
// uchun toifaning o'z nomi/ruscha nomi/slug'idan aniqlanadi — admin uni
// qanday nomlagan bo'lsa ham, ikkala tilda ham ishlaydi.

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

export type CategorySizeKind = 'clothing' | 'shoes' | 'none';

export interface CategoryLike {
  name?: string | null;
  nameRu?: string | null;
  slug?: string | null;
}

function haystackOf(cat: CategoryLike): string {
  return `${cat.name ?? ''} ${cat.nameRu ?? ''} ${cat.slug ?? ''}`.toLowerCase();
}

// "Krossovka"/"кроссовки" (sneakers), "poyabzal"/"обувь" (footwear, generic),
// "tufli"/"туфли" (shoes), "botinka"/"ботинки" (boots), "sandal"/"сандалии",
// "sapog"/"сапоги".
export function isFootwearCategory(cat?: CategoryLike | null): boolean {
  if (!cat) return false;
  return /shoe|poyabzal|обув|krossov|кроссов|tufli|туфли|botin|ботин|sneaker|sandal|сандал|sapog|сапог/.test(
    haystackOf(cat),
  );
}

// "Aksessuar"/"аксессуары" (accessories), "kosmetika"/"косметика"
// (cosmetics), "parfyum(eriya)"/"парфюм(ерия)" (perfume), "sumka"/"сумки"
// (bags), "soat"/"часы" (watches), "ko'zoynak"/"очки" (glasses) — bularning
// hech biri kiyim yoki poyabzal o'lchamida kelmaydi.
export function isSizelessCategory(cat?: CategoryLike | null): boolean {
  if (!cat) return false;
  return /aksessuar|аксессуар|kosmetika|косметик|parfyum|парфюм|parfum|sumka|сумк|soat|часы|ko.?zoynak|очки/.test(
    haystackOf(cat),
  );
}

// Toifa tanlanmagan bo'lsa (do'konda "Barchasi", adminda hali tanlanmagan)
// — avvalgi xulq-atvor saqlanadi: kiyim o'lchamlari.
export function getCategorySizeKind(cat?: CategoryLike | null): CategorySizeKind {
  if (isSizelessCategory(cat)) return 'none';
  if (isFootwearCategory(cat)) return 'shoes';
  return 'clothing';
}

// Bo'sh massiv = o'lcham bo'limi umuman ko'rsatilmasin.
export function getSizeOptions(cat?: CategoryLike | null): string[] {
  switch (getCategorySizeKind(cat)) {
    case 'none':
      return [];
    case 'shoes':
      return SHOE_SIZES;
    default:
      return CLOTHING_SIZES;
  }
}
