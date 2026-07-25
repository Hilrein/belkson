import type { RegionId, SortOption } from '../types/shop'

export interface FetchNextParams {
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

class NextCatalogService {
  private cache = new Map<string, { timestamp: number; data: any }>()
  private CACHE_TTL_MS = 5 * 60 * 1000

  async fetchNextCatalog(params: FetchNextParams): Promise<any> {
    const cacheKey = JSON.stringify(params)
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data
    }

    const queryParams = new URLSearchParams()
    if (params.region) queryParams.set('region', params.region)
    if (params.category) queryParams.set('category', params.category)
    if (params.subcategory) queryParams.set('subcategory', params.subcategory)
    if (params.size) queryParams.set('size', params.size)
    if (params.priceMinRub) queryParams.set('priceMin', String(params.priceMinRub))
    if (params.priceMaxRub) queryParams.set('priceMax', String(params.priceMaxRub))
    if (params.sortBy) queryParams.set('sortBy', params.sortBy)
    if (params.search) queryParams.set('search', params.search)
    if (params.page) queryParams.set('page', String(params.page))
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize))

    const url = `/api/next/catalog?${queryParams.toString()}`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`[NextCatalogService] HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (data && Array.isArray(data.products)) {
        this.cache.set(cacheKey, { timestamp: Date.now(), data })
        return data
      }
      throw new Error('[NextCatalogService] Invalid response format')
    } catch (err) {
      console.warn('[NextCatalogService] API fetch error:', err)
      throw err
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const nextCatalogService = new NextCatalogService()
