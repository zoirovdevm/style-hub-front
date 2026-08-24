import type { Locale } from '@/i18n/config';

// Mahsulot ranglari admin panelida doim faqat o'zbekcha nom bilan saqlanadi
// (masalan "Qora", "Ko'k" — bazada rang uchun sarlavha/tavsif kabi alohida
// "colorRu" maydoni yo'q). Shuning uchun sayt rus tilida ko'rsatilganda ham
// rang nomlari o'zbekcha chiqib qolar edi. Bu — ShopFilters.tsx/ProductForm
// ichida ishlatiladigan qat'iy 9 ta standart rang nomi uchun tarjima
// jadvali. Agar kelajakda admin panelga erkin (shu 9 tadan tashqari) rang
// nomi kiritish imkoni qo'shilsa, jadvalda topilmagan nom o'zgarishsiz
// (xavfsiz fallback sifatida) qaytariladi — ya'ni bu funksiya hech qachon
// bo'sh/undefined qaytarmaydi, faqat tarjima qila olsa tarjima qiladi.
const COLOR_NAME_RU: Record<string, string> = {
  qora: 'Чёрный',
  oq: 'Белый',
  kulrang: 'Серый',
  kok: 'Синий',
  qizil: 'Красный',
  yashil: 'Зелёный',
  sariq: 'Жёлтый',
  jigarrang: 'Коричневый',
  bej: 'Бежевый',
};

// Kalitni normalizatsiya qilish — "Ko'k" so'zidagi apostrof turli
// klaviatura/terminaldan turlicha belgi (', ', `, ʻ) bo'lib kelishi mumkin,
// shuning uchun qidiruvdan oldin ularning barchasi olib tashlanadi.
function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/['’`ʻ]/g, '');
}

export function translateColorName(name: string, locale: Locale): string {
  if (locale !== 'ru' || !name) return name;
  return COLOR_NAME_RU[normalizeKey(name)] ?? name;
}
