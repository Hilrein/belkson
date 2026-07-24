import type { CatalogPaginatedResponse, CatalogQueryOptions } from '../types/zaraTaxonomy'

class CatalogCache {
  private cache = new Map<string, { timestamp: number; data: CatalogPaginatedResponse }>()
  private TTL_MS = 5 * 60 * 1000 // 5 minutes cache

  private buildKey(options: CatalogQueryOptions): string {
    return [
      options.region,
      options.category,
      options.subcategory || 'all',
      options.size || 'all',
      options.priceMinRub || 0,
      options.priceMaxRub || 0,
      options.sortBy || 'featured',
      options.search?.trim().toLowerCase() || '',
      options.page,
      options.pageSize,
    ].join(':')
  }

  get(options: CatalogQueryOptions): CatalogPaginatedResponse | null {
    const key = this.buildKey(options)
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  set(options: CatalogQueryOptions, data: CatalogPaginatedResponse): void {
    const key = this.buildKey(options)
    this.cache.set(key, { timestamp: Date.now(), data })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const catalogCache = new CatalogCache()
