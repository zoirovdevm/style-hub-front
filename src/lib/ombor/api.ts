// Ombor backendiga (/ombor-api/*) so'rovlar.
//
// Manzil NISBIY — next.config.js dagi rewrite uni backendga uzatadi, ya'ni
// Mini App va API bitta domenda (CORS muammosi yo'q).
//
// Sessiya tokeni faqat XOTIRADA saqlanadi (localStorage'da emas): Mini App
// har ochilganda Telegram bergan imzolangan initData orqali yangisi
// olinadi, shuning uchun uni diskda saqlashga hojat yo'q.

export interface OmborUser {
  id: string;
  firstName?: string | null;
  username?: string | null;
}

export interface SessionResponse {
  authenticated: boolean;
  token?: string;
  store?: { name: string };
  user: OmborUser;
}

export interface ProductListItem {
  id: string;
  title: string;
  titleRu: string | null;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryNameRu: string | null;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number;
}

export interface ProductDetailData {
  id: string;
  title: string;
  titleRu: string | null;
  sku: string;
  price: number;
  basePrice: number;
  stock: number;
  images: string[];
  colorImages: { color: string; images: string[] }[];
  category: { id: string; name: string; nameRu: string | null } | null;
  variants: ProductVariant[];
}

export interface CategoryItem {
  id: string;
  name: string;
  nameRu: string | null;
  productCount: number;
}

export interface DeductResult {
  productId: string;
  productTitle: string;
  variantLabel: string | null;
  deducted: number;
  remainingVariant: number | null;
  remainingProduct: number;
}

// Backend qaytaradigan xato kodi (masalan INVALID_CODE, INSUFFICIENT_STOCK).
export class OmborApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

let sessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

// Token muddati tugasa yoki "Chiqish"dan keyin bekor bo'lsa — ilova
// kirish sahifasiga qaytadi.
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/ombor-api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let code = 'UNKNOWN';
    try {
      const body = await res.json();
      code = Array.isArray(body?.message) ? 'VALIDATION' : String(body?.message ?? code);
    } catch {
      /* JSON emas */
    }
    if (res.status === 401 && code === 'SESSION_EXPIRED') onUnauthorized?.();
    throw new OmborApiError(res.status, code);
  }
  return res.json() as Promise<T>;
}

export const omborApi = {
  session: (initData: string) =>
    request<SessionResponse>('/session', { method: 'POST', body: JSON.stringify({ initData }) }),
  login: (initData: string, code: string) =>
    request<SessionResponse>('/login', { method: 'POST', body: JSON.stringify({ initData, code }) }),
  logout: () => request<{ ok: boolean }>('/logout', { method: 'POST' }),
  products: (params: { q?: string; categoryId?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.categoryId) sp.set('categoryId', params.categoryId);
    const qs = sp.toString();
    return request<ProductListItem[]>(`/products${qs ? `?${qs}` : ''}`);
  },
  product: (id: string) => request<ProductDetailData>(`/products/${encodeURIComponent(id)}`),
  categories: () => request<CategoryItem[]>('/categories'),
  deduct: (body: { productId: string; variantId?: string; quantity: number; requestId: string }) =>
    request<DeductResult>('/deduct', { method: 'POST', body: JSON.stringify(body) }),
};
