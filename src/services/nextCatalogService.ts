import type { Product, RegionId, SortOption } from '../types/shop'

export interface FetchNextCatalogParams {
  region?: RegionId
  category?: string
  subcategory?: string
  size?: string
  priceMinRub?: number
  priceMaxRub?: number
  sortBy?: SortOption
  search?: string
  page?: number
  pageSize?: number
}

export interface FetchNextCatalogResult {
  products: Product[]
  totalCount: number
  hasMore: boolean
  availableSizes: string[]
}

export const nextCatalogService = {
  async fetchNextCatalog(params: FetchNextCatalogParams): Promise<FetchNextCatalogResult> {
    const query = new URLSearchParams()
    query.set('region', params.region || 'uk')
    if (params.category) query.set('category', params.category)
    if (params.subcategory) query.set('subcategory', params.subcategory)
    if (params.size) query.set('size', params.size)
    if (params.priceMinRub !== undefined) query.set('priceMin', String(params.priceMinRub))
    if (params.priceMaxRub !== undefined) query.set('priceMax', String(params.priceMaxRub))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.search) query.set('search', params.search)
    query.set('page', String(params.page || 1))
    query.set('pageSize', String(params.pageSize || 24))

    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const endpoint = `${apiUrl}/api/next/catalog?${query.toString()}`

    console.log('Fetching Next API:', endpoint)

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      let errMsg = `Ошибка сервера (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson.error) errMsg = errJson.error
      } catch {
        /* ignore */
      }
      throw new Error(errMsg)
    }

    const data = await response.json()
    return {
      products: data.products || [],
      totalCount: data.totalCount || 0,
      hasMore: Boolean(data.hasMore),
      availableSizes: data.availableSizes || [],
    }
  },
}
