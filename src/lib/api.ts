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

export type PaginatedCatalogResponse = CatalogResponse & {
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export const api = {
  /** Fetch single page — useful for chunked loading to avoid Neon 64 MB limit. Optional server-side search + showcase filters. */
  getCatalogPage: (page = 1, limit = 50, q = '', opts?: { isNew?: boolean; isFavorite?: boolean }) => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (q.trim()) params.set('q', q.trim())
    if (opts?.isNew) params.set('isNew', 'true')
    if (opts?.isFavorite) params.set('isFavorite', 'true')
    return request<PaginatedCatalogResponse>(`/api/catalog?${params.toString()}`)
  },

  /** Fetch all products matching showcase filter (Новинки/Любимчики) — loads all pages, but each page is small (index scan). */
  getShowcase: async (filter: 'new' | 'favorite', limitPerPage = 100): Promise<CatalogResponse & { total: number }> => {
    const isNew = filter === 'new'
    const isFavorite = filter === 'favorite'
    let page = 1
    let allProducts: CatalogProduct[] = []
    let total = 0
    let currency: CurrencyCode = 'RUB'
    while (true) {
      const chunk = await request<PaginatedCatalogResponse>(
        `/api/catalog?page=${page}&limit=${limitPerPage}${isNew ? '&isNew=true' : ''}${isFavorite ? '&isFavorite=true' : ''}`,
      )
      if (page === 1) {
        currency = chunk.currency
        total = chunk.total
      }
      allProducts.push(...chunk.products)
      if (!chunk.hasMore || chunk.products.length === 0) break
      // safety: если новинок очень много (сотни), грузим всё равно, но не более 10 страниц (~1000)
      page += 1
      if (page > 10) break
    }
    return { products: allProducts, currency, total }
  },

  /** Fetch all products chunk by chunk (safe for large DB). Keeps old signature. */
  getCatalog: async (): Promise<CatalogResponse> => {
    const limit = 50
    let page = 1
    let allProducts: CatalogProduct[] = []
    let currency: CurrencyCode = 'RUB'

    while (true) {
      const chunk = await request<PaginatedCatalogResponse>(
        `/api/catalog?page=${page}&limit=${limit}`,
      )
      if (page === 1) currency = chunk.currency
      allProducts.push(...chunk.products)
      const hasMore =
        typeof chunk.hasMore === 'boolean'
          ? chunk.hasMore
          : chunk.products.length === limit && allProducts.length < (chunk.total ?? Infinity)
      if (!hasMore || chunk.products.length === 0) break
      page += 1
      if (page > 500) break // safety guard ~25k products
    }

    return { products: allProducts, currency }
  },

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
