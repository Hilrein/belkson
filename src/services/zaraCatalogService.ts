import type {
  CatalogPaginatedResponse,
  CatalogQueryOptions,
} from '../types/zaraTaxonomy'

export const zaraCatalogService = {
  /**
   * Fetches real Zara Kids catalog data from server-side scraper API (/api/zara/catalog)
   */
  async fetchZaraKidsCatalog(
    options: CatalogQueryOptions
  ): Promise<CatalogPaginatedResponse> {
    const params = new URLSearchParams()
    if (options.region) params.set('region', options.region)
    if (options.category) params.set('category', options.category)
    if (options.subcategory) params.set('subcategory', options.subcategory)
    if (options.size) params.set('size', options.size)
    if (options.priceMinRub) params.set('priceMin', String(options.priceMinRub))
    if (options.priceMaxRub) params.set('priceMax', String(options.priceMaxRub))
    if (options.sortBy) params.set('sortBy', options.sortBy)
    if (options.search) params.set('search', options.search)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))

    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const endpoint = `${apiUrl}/api/zara/catalog?${params.toString()}`

    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error(`[HTTP ${res.status}] ${res.statusText || 'Сервер не отвечает'}`)
      }

      const data: CatalogPaginatedResponse = await res.json()
      return data
    } catch (err) {
      console.error('Zara Catalog Fetch error:', err)
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Не удалось подключиться к серверу каталога Zara'
      )
    }
  },
}
