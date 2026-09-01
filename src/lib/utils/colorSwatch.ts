// ROOT-CAUSE FIX for "rang har joyda boshqacha ko'rinadi" (the color swatch
// looks different in different places): four separate spots in this app
// each need to turn a product's color NAME (a plain string like "Qizil")
// into an actual color to paint a swatch with — the admin's product form,
// the shop page's filter sidebar, the quick-buy modal, and the product
// detail page's own color picker — and each of them used to keep its OWN
// hardcoded name→hex list. They'd drifted apart (e.g. "Qizil" was #a83232
// in the admin form/shop filter but #dc2626 in the quick-buy modal), so the
// same color read as a visibly different shade depending which part of the
// site you were looking at. This is the one shared source all four now
// import from, so a color always paints the same swatch everywhere.

// The curated one-click preset list the admin panel offers when adding a
// product's colors, and the shop filter sidebar's fixed swatch list — both
// want this exact ordered {name, hex} shape.
export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'Qora', hex: '#111114' },
  { name: 'Oq', hex: '#f7f5f2' },
  { name: 'Kulrang', hex: '#8b8b8b' },
  { name: "Ko'k", hex: '#2b4a7a' },
  { name: 'Qizil', hex: '#a83232' },
  { name: 'Yashil', hex: '#3a6b45' },
  { name: 'Sariq', hex: '#d8b969' },
  { name: 'Jigarrang', hex: '#6b4a2f' },
  { name: 'Bej', hex: '#d8c9a8' },
];

// Broader lookup for turning an arbitrary color name (however it's actually
// stored on a product — including a custom color an admin free-typed, or
// the same color spelled in Uzbek/Russian/English) into a real color for a
// swatch. Built from PRESET_COLORS' own hex values (kept in sync by hand —
// there are only 9) plus common synonyms, so a preset color always matches
// the exact shade shown when the admin picked it.
const COLOR_SWATCHES: Record<string, string> = {
  qora: '#111114',
  black: '#111114',
  чёрный: '#111114',
  черный: '#111114',
  oq: '#f7f5f2',
  white: '#f7f5f2',
  белый: '#f7f5f2',
  kulrang: '#8b8b8b',
  gray: '#8b8b8b',
  grey: '#8b8b8b',
  серый: '#8b8b8b',
  "ko'k": '#2b4a7a',
  kok: '#2b4a7a',
  blue: '#2b4a7a',
  navy: '#2b4a7a',
  синий: '#2b4a7a',
  qizil: '#a83232',
  red: '#a83232',
  красный: '#a83232',
  yashil: '#3a6b45',
  green: '#3a6b45',
  зелёный: '#3a6b45',
  зеленый: '#3a6b45',
  sariq: '#d8b969',
  yellow: '#d8b969',
  жёлтый: '#d8b969',
  желтый: '#d8b969',
  jigarrang: '#6b4a2f',
  brown: '#6b4a2f',
  коричневый: '#6b4a2f',
  bej: '#d8c9a8',
  beige: '#d8c9a8',
  бежевый: '#d8c9a8',
  pink: '#f472b6',
  розовый: '#f472b6',
  orange: '#f97316',
  оранжевый: '#f97316',
  purple: '#a855f7',
  фиолетовый: '#a855f7',
};

// Anything not recognized (a genuinely custom color name) falls back to a
// neutral gray dot rather than breaking.
export function swatchColor(name: string): string {
  return COLOR_SWATCHES[name.trim().toLowerCase()] ?? '#9ca3af';
}
