export function formatPrice(value: number | string, locale: 'uz' | 'ru' = 'uz') {
  const num = Number(value);
  const formatted = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'uz-UZ', {
    maximumFractionDigits: 0,
  }).format(num);
  return `${formatted} so'm`;
}

export function formatDate(value: string | Date, locale: 'uz' | 'ru' = 'uz') {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
