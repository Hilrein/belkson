import type { CatalogProduct, CurrencyCode } from '../store/catalog'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let message = ''
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      /* non-JSON body (e.g. Vercel FUNCTION_INVOCATION_FAILED) */
    }
    if (!message) {
      message =
        res.status === 500
          ? 'HTTP 500 — API упал (часто нет DATABASE_URL на Vercel или сбой serverless). Смотрите логи функции.'
          : res.statusText || `HTTP ${res.status}`
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export type CatalogResponse = {
  products: CatalogProduct[]
  currency: CurrencyCode
}

export const api = {
  getCatalog: () => request<CatalogResponse>('/api/catalog'),

  createProduct: (body: Omit<CatalogProduct, 'id'>) =>
    request<CatalogProduct>('/api/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProduct: (id: number, body: Partial<CatalogProduct>) =>
    request<CatalogProduct>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteProduct: (id: number) =>
    request<{ ok: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    }),

  setCurrency: (currency: CurrencyCode) =>
    request<{ currency: CurrencyCode }>('/api/settings/currency', {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    }),
}
