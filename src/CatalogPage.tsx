import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from './store/CatalogContext'
import { useCart } from './store/CartContext'
import {
  CATEGORIES,
  categoriesMatch,
  normalizeCategory,
  type CatalogProduct,
} from './store/catalog'

const FILTER_ALL = 'all'
const FILTER_NEW = 'new'
const FILTER_FAVORITE = 'favorite'

/**
 * Minimal catalog — editorial layout inspired by clean fashion PLP,
 * adapted to Belkson palette (lavender primary, soft surface, Quicksand).
 */
export default function CatalogPage() {
  const { products, format, inStock } = useCatalog()
  const { addToCart } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [filterOpen, setFilterOpen] = useState(false)
  /** Grid density: 2 | 3 | 4 columns on desktop */
  const [cols, setCols] = useState(4)

  // Decode once; handle accidental double-encoding from old links
  const rawCategoryParam = searchParams.get('category')
  const activeFilter = useMemo(() => {
    if (!rawCategoryParam) return FILTER_ALL
    let decoded = rawCategoryParam
    try {
      // If still percent-encoded after get(), decode again
      if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
        decoded = decodeURIComponent(decoded)
      }
    } catch {
      /* keep as-is */
    }
    return decoded.trim() || FILTER_ALL
  }, [rawCategoryParam])

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

  const setFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === FILTER_ALL) next.delete('category')
      else next.set('category', value)
      // Drop stale search when switching pure category tabs (optional keep q)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleAddToCart = useCallback(
    (product: CatalogProduct, e?: MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      addToCart(product)
    },
    [addToCart],
  )

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.status !== 'Нет в наличии')
    if (activeFilter === FILTER_NEW) {
      list = list.filter((p) => p.isNew || p.badge === 'NEW')
    } else if (activeFilter === FILTER_FAVORITE) {
      list = list.filter((p) => p.isFavorite)
    } else if (activeFilter !== FILTER_ALL) {
      list = list.filter((p) => categoriesMatch(p.category, activeFilter))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          normalizeCategory(p.category).includes(q),
      )
    }
    return list
  }, [products, activeFilter, query])

  /** Fixed tabs + any categories present on products (so nothing is “lost”). */
  const navItems = useMemo(() => {
    const fixed: { id: string; label: string }[] = [
      { id: FILTER_ALL, label: 'Смотреть всё' },
      { id: FILTER_NEW, label: 'Новинки' },
      { id: FILTER_FAVORITE, label: 'Любимчики' },
      ...CATEGORIES.map((c) => ({ id: c, label: c })),
    ]
    const known = new Set(fixed.map((f) => normalizeCategory(f.id)))
    const extra = new Map<string, string>()
    for (const p of products) {
      if (p.status === 'Нет в наличии') continue
      const raw = String(p.category ?? '').trim()
      if (!raw) continue
      const key = normalizeCategory(raw)
      if (!known.has(key) && !extra.has(key)) extra.set(key, raw)
    }
    return [
      ...fixed,
      ...[...extra.values()].map((c) => ({ id: c, label: c })),
    ]
  }, [products])

  const onQueryChange = (value: string) => {
    setQuery(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const gridClass =
    cols <= 2
      ? 'grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-14'
      : cols === 3
        ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12'
        : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-12'

  return (
    <main className="bg-background min-h-[60vh]">
      {/* Hero strip — minimalist promo like example */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pt-12 md:pt-16 pb-8 md:pb-10 text-center">
        <h1 className="font-headline-md text-primary text-2xl sm:text-3xl md:text-[2rem] tracking-[0.08em] uppercase font-semibold mb-3">
          Каталог Belkson
        </h1>
        <p className="text-on-surface-variant text-sm md:text-[15px] max-w-md mx-auto leading-relaxed">
          Мягкие вещи для малышей — выбирайте по возрасту или листайте всё.
        </p>
      </section>

      {/* Category text nav — uppercase, spaced, no pills */}
      <nav
        className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pb-6 md:pb-8"
        aria-label="Категории каталога"
      >
        <ul className="flex flex-wrap justify-center gap-x-5 sm:gap-x-7 md:gap-x-9 gap-y-3">
          {navItems.map((item) => {
            const active =
              item.id === FILTER_ALL
                ? activeFilter === FILTER_ALL
                : item.id === FILTER_NEW || item.id === FILTER_FAVORITE
                  ? activeFilter === item.id
                  : categoriesMatch(item.id, activeFilter)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={
                    'text-[11px] sm:text-xs tracking-[0.14em] uppercase transition-colors ' +
                    (active
                      ? 'text-primary font-semibold'
                      : 'text-outline font-medium hover:text-primary')
                  }
                >
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Toolbar: sticks under fixed navbar while scrolling */}
      <div className="catalog-sticky-toolbar border-t border-b border-surface-dim/80 shadow-[0_1px_0_rgba(29,25,43,0.04)]">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop h-12 md:h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 text-[11px] sm:text-xs tracking-[0.16em] uppercase font-semibold text-on-surface hover:text-primary transition-colors"
            aria-expanded={filterOpen}
          >
            <span className="material-symbols-outlined text-[18px]">
              {filterOpen ? 'close' : 'tune'}
            </span>
            Фильтровать
            {query.trim() ? (
              <span className="normal-case tracking-normal text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                1
              </span>
            ) : null}
          </button>

          <div className="flex items-center gap-3 text-on-surface">
            <span className="text-[11px] sm:text-xs tracking-[0.16em] uppercase font-semibold text-outline hidden sm:inline">
              Вид
            </span>
            <button
              type="button"
              aria-label="Мельче (больше колонок)"
              disabled={cols >= 4}
              onClick={() => setCols((c) => Math.min(4, c + 1))}
              className="w-8 h-8 flex items-center justify-center text-lg leading-none text-on-surface hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface transition-colors"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Крупнее (меньше колонок)"
              disabled={cols <= 2}
              onClick={() => setCols((c) => Math.max(2, c - 1))}
              className="w-8 h-8 flex items-center justify-center text-lg leading-none text-on-surface hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        {filterOpen && (
          <div className="border-t border-surface-dim/60 bg-surface-container-low/50">
            <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1 max-w-xl">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Поиск по названию, цвету, артикулу…"
                  className="w-full rounded-full border border-outline-variant/70 bg-surface py-2.5 pl-11 pr-4 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50"
                  autoFocus
                />
              </div>
              <p className="text-xs text-on-surface-variant shrink-0">
                {filtered.length}{' '}
                {filtered.length === 1
                  ? 'товар'
                  : filtered.length > 1 && filtered.length < 5
                    ? 'товара'
                    : 'товаров'}
                {inStock.length > 0 && !query
                  ? ` · в наличии ${inStock.length}`
                  : ''}
              </p>
              {(query || activeFilter !== FILTER_ALL) && (
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('')
                    setFilter(FILTER_ALL)
                  }}
                  className="text-xs tracking-wide uppercase text-primary font-semibold hover:underline self-start sm:self-auto"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product grid — clean cards, no heavy chrome */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-14">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-on-surface text-base mb-2 font-medium">
              Ничего не нашли
            </p>
            <p className="text-on-surface-variant text-sm mb-8">
              Попробуйте другую категорию или сбросьте фильтры.
            </p>
            <button
              type="button"
              onClick={() => {
                onQueryChange('')
                setFilter(FILTER_ALL)
              }}
              className="text-xs tracking-[0.14em] uppercase font-semibold text-primary border-b border-primary pb-0.5 hover:opacity-70 transition-opacity"
            >
              Смотреть всё
            </button>
          </div>
        ) : (
          <div className={gridClass}>
            {filtered.map((product) => (
              <article key={product.id} className="group flex flex-col">
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-3 md:mb-4">
                  <img
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    alt={product.name}
                    src={product.image}
                  />
                  {(product.badge === 'NEW' || product.isNew) && (
                    <span className="absolute top-3 left-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-primary bg-surface/90 px-2 py-1">
                      New
                    </span>
                  )}
                  {product.status === 'Мало' && (
                    <span className="absolute top-3 right-3 text-[10px] tracking-[0.12em] uppercase font-medium text-on-surface-variant bg-surface/90 px-2 py-1">
                      Мало
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(product, e)}
                    className="hidden md:block absolute inset-x-0 bottom-0 py-3 bg-primary text-on-primary text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                  >
                    В корзину
                  </button>
                </div>
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm md:text-[15px] font-medium text-on-surface leading-snug line-clamp-2">
                      {product.name}
                    </h2>
                    <span className="text-sm md:text-[15px] font-medium text-primary shrink-0 tabular-nums">
                      {format(product.priceRub)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {product.color}
                    {product.category ? ` · ${product.category}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(product, e)}
                    className="md:hidden mt-2 self-start text-[11px] tracking-[0.12em] uppercase font-semibold text-primary border-b border-primary/40 pb-0.5"
                  >
                    В корзину
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
