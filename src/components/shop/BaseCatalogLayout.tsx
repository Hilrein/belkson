import { useState, type ReactNode, type RefObject } from 'react'
import type { SortOption } from '../../types/shop'
import { ProductGridSkeleton } from './ProductGridSkeleton'

export interface CategoryTabItem {
  id: string
  label: string
}

export interface SubcategoryChipItem {
  id: string
  label: string
}

export interface BaseCatalogLayoutProps<T> {
  // Hero section props
  title: string
  subtitle?: string
  badgeText?: string

  // Main Category Tabs
  categoryTabs: CategoryTabItem[]
  activeCategory: string
  onSelectCategory: (id: string) => void

  // Subcategories Chips (optional)
  subcategories?: SubcategoryChipItem[]
  activeSubcategory?: string
  onSelectSubcategory?: (id: string) => void

  // Size Filter (optional)
  availableSizes?: string[]
  selectedSize?: string
  onSelectSize?: (size: string) => void

  // Price Filter (optional)
  priceMinRub?: number
  priceMaxRub?: number
  onPriceChange?: (min?: number, max?: number) => void

  // Search & Sort
  searchQuery?: string
  onSearchChange?: (q: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void

  // Data & Rendering
  items: T[]
  renderItem: (item: T) => ReactNode
  totalCount: number
  loadingInitial?: boolean
  loadingMore?: boolean
  error?: string | null

  // Reset Actions
  onResetAll?: () => void

  // Infinite Scroll Sentinel Ref
  sentinelRef?: RefObject<HTMLDivElement | null>
}

export function BaseCatalogLayout<T>({
  title,
  subtitle,
  badgeText,
  categoryTabs,
  activeCategory,
  onSelectCategory,
  subcategories = [],
  activeSubcategory = 'all',
  onSelectSubcategory,
  availableSizes = [],
  selectedSize = 'all',
  onSelectSize,
  priceMinRub,
  priceMaxRub,
  onPriceChange,
  searchQuery = '',
  onSearchChange,
  sortBy,
  onSortChange,
  items,
  renderItem,
  totalCount,
  loadingInitial = false,
  loadingMore = false,
  error = null,
  onResetAll,
  sentinelRef,
}: BaseCatalogLayoutProps<T>) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [cols, setCols] = useState(4)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [minInput, setMinInput] = useState<string>(priceMinRub ? String(priceMinRub) : '')
  const [maxInput, setMaxInput] = useState<string>(priceMaxRub ? String(priceMaxRub) : '')

  const handleApplyPrice = () => {
    const min = minInput ? parseInt(minInput, 10) : undefined
    const max = maxInput ? parseInt(maxInput, 10) : undefined
    if (onPriceChange) onPriceChange(min, max)
    setPriceOpen(false)
  }

  const handleReset = () => {
    if (onResetAll) onResetAll()
    setMinInput('')
    setMaxInput('')
  }

  const hasActiveFilters =
    activeSubcategory !== 'all' ||
    selectedSize !== 'all' ||
    Boolean(searchQuery.trim()) ||
    (priceMinRub !== undefined && priceMinRub > 0) ||
    (priceMaxRub !== undefined && priceMaxRub > 0)

  const gridClass =
    cols <= 2
      ? 'grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-14'
      : cols === 3
        ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12'
        : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-12'

  return (
    <main className="bg-background min-h-[60vh]">
      {/* Hero Header */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pt-12 md:pt-16 pb-6 md:pb-8 text-center">
        {badgeText && (
          <div className="inline-flex items-center gap-2 bg-surface-container-low px-3.5 py-1 rounded-full text-xs text-on-surface-variant font-medium mb-3 border border-surface-dim">
            <span>{badgeText}</span>
          </div>
        )}
        <h1 className="font-headline-md text-primary text-2xl sm:text-3xl md:text-[2rem] tracking-[0.08em] uppercase font-semibold mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-on-surface-variant text-sm md:text-[15px] max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </section>

      {/* Category Text Nav — Uppercase, spaced matching CatalogPage.tsx */}
      {categoryTabs.length > 0 && (
        <nav
          className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pb-6 md:pb-8"
          aria-label="Категории каталога"
        >
          <ul className="flex flex-wrap justify-center gap-x-5 sm:gap-x-7 md:gap-x-9 gap-y-3">
            {categoryTabs.map((item) => {
              const active = item.id === activeCategory
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(item.id)}
                    className={`text-[11px] sm:text-xs tracking-[0.14em] uppercase transition-colors ${
                      active
                        ? 'text-primary font-semibold'
                        : 'text-outline font-medium hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {/* Sticky Toolbar */}
      <div className="catalog-sticky-toolbar border-t border-b border-surface-dim/80 shadow-[0_1px_0_rgba(29,25,43,0.04)] mb-8">
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
            {hasActiveFilters && (
              <span className="normal-case tracking-normal text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Активен
              </span>
            )}
          </button>

          <div className="flex items-center gap-4 text-on-surface">
            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent border-none text-[11px] sm:text-xs tracking-[0.14em] uppercase font-semibold text-on-surface focus:outline-none cursor-pointer hover:text-primary"
            >
              <option value="featured">По популярности</option>
              <option value="price_asc">Сначала дешевле</option>
              <option value="price_desc">Сначала дороже</option>
              <option value="newest">Новинки</option>
            </select>

            {/* Grid density switcher */}
            <div className="flex items-center gap-2 border-l border-surface-dim/80 pl-4">
              <span className="text-[11px] sm:text-xs tracking-[0.16em] uppercase font-semibold text-outline hidden sm:inline">
                Вид
              </span>
              <button
                type="button"
                aria-label="Мельче (больше колонок)"
                disabled={cols >= 4}
                onClick={() => setCols((c) => Math.min(4, c + 1))}
                className="w-7 h-7 flex items-center justify-center text-base leading-none text-on-surface hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface transition-colors"
              >
                −
              </button>
              <button
                type="button"
                aria-label="Крупнее (меньше колонок)"
                disabled={cols <= 2}
                onClick={() => setCols((c) => Math.max(2, c - 1))}
                className="w-7 h-7 flex items-center justify-center text-base leading-none text-on-surface hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Filter Drawer */}
        {filterOpen && (
          <div className="border-t border-surface-dim/60 bg-surface-container-low/50">
            <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-5 flex flex-col gap-4">
              {/* Search input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-xl">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    search
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    placeholder="Поиск по названию, артикулу..."
                    className="w-full rounded-full border border-outline-variant/70 bg-surface py-2 pl-11 pr-4 text-xs sm:text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50"
                    autoFocus
                  />
                </div>

                <span className="text-xs text-on-surface-variant shrink-0">
                  Всего товаров: <strong className="text-on-surface">{totalCount}</strong>
                </span>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs tracking-wide uppercase text-primary font-semibold hover:underline self-start sm:self-auto"
                  >
                    Сбросить все
                  </button>
                )}
              </div>

              {/* Subcategories Chips */}
              {subcategories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectSubcategory && onSelectSubcategory(sub.id)}
                      className={`py-1 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                        activeSubcategory === sub.id
                          ? 'bg-primary text-on-primary border-primary shadow-xs font-semibold'
                          : 'bg-surface text-on-surface-variant border-surface-dim hover:border-on-surface-variant'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Size & Price Dropdowns */}
              {(availableSizes.length > 0 || onPriceChange) && (
                <div className="flex items-center gap-3 pt-2 border-t border-surface-dim/40 flex-wrap">
                  {availableSizes.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setSizeOpen(!sizeOpen)
                          setPriceOpen(false)
                        }}
                        className={`py-1 px-3 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          selectedSize !== 'all'
                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                            : 'bg-surface border-surface-dim text-on-surface hover:border-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">straighten</span>
                        <span>{selectedSize !== 'all' ? `Размер: ${selectedSize}` : 'Рост / Размер'}</span>
                      </button>

                      {sizeOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-surface rounded-2xl shadow-xl border border-surface-dim p-3 z-30 animate-fade-in">
                          <span className="text-[11px] font-semibold text-on-surface block mb-2">
                            Выберите рост / размер:
                          </span>
                          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSize && onSelectSize('all')
                                setSizeOpen(false)
                              }}
                              className={`text-left text-xs py-1.5 px-2 rounded-lg transition-colors ${
                                selectedSize === 'all' ? 'bg-primary text-on-primary font-semibold' : 'hover:bg-surface-container-low text-on-surface'
                              }`}
                            >
                              Все размеры
                            </button>
                            {availableSizes.map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => {
                                  onSelectSize && onSelectSize(sz)
                                  setSizeOpen(false)
                                }}
                                className={`text-left text-xs py-1.5 px-2 rounded-lg transition-colors ${
                                  selectedSize === sz ? 'bg-primary text-on-primary font-semibold' : 'hover:bg-surface-container-low text-on-surface'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {onPriceChange && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setPriceOpen(!priceOpen)
                          setSizeOpen(false)
                        }}
                        className={`py-1 px-3 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          (priceMinRub !== undefined && priceMinRub > 0) || (priceMaxRub !== undefined && priceMaxRub > 0)
                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                            : 'bg-surface border-surface-dim text-on-surface hover:border-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">payments</span>
                        <span>
                          {priceMinRub || priceMaxRub
                            ? `Цена: ${priceMinRub || 0} - ${priceMaxRub || '∞'} ₽`
                            : 'Диапазон цен'}
                        </span>
                      </button>

                      {priceOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-surface rounded-2xl shadow-xl border border-surface-dim p-4 z-30 animate-fade-in">
                          <span className="text-[11px] font-semibold text-on-surface block mb-3">
                            Цена в ₽:
                          </span>
                          <div className="flex items-center gap-2 mb-4">
                            <input
                              type="number"
                              placeholder="От ₽"
                              value={minInput}
                              onChange={(e) => setMinInput(e.target.value)}
                              className="w-full bg-surface-container-low border border-surface-dim rounded-xl py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                            <span className="text-on-surface-variant text-xs">—</span>
                            <input
                              type="number"
                              placeholder="До ₽"
                              value={maxInput}
                              onChange={(e) => setMaxInput(e.target.value)}
                              className="w-full bg-surface-container-low border border-surface-dim rounded-xl py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMinInput('')
                                setMaxInput('')
                                onPriceChange(undefined, undefined)
                                setPriceOpen(false)
                              }}
                              className="py-1.5 px-3 text-xs text-on-surface-variant hover:text-on-surface"
                            >
                              Сбросить
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyPrice}
                              className="py-1.5 px-4 bg-primary text-on-primary rounded-xl text-xs font-semibold"
                            >
                              Применить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-6 md:py-10">
        {loadingInitial ? (
          <ProductGridSkeleton cols={cols} count={12} />
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-error text-base mb-2 font-medium">Ошибка загрузки</p>
            <p className="text-on-surface-variant text-sm mb-8">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-on-surface text-base mb-2 font-medium">Ничего не нашли</p>
            <p className="text-on-surface-variant text-sm mb-8">
              По выбранным фильтрам в каталоге нет товаров.
            </p>
            {handleReset && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs tracking-[0.14em] uppercase font-semibold text-primary border-b border-primary pb-0.5 hover:opacity-70 transition-opacity"
              >
                Смотреть всё
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={gridClass}>{items.map((item) => renderItem(item))}</div>

            {/* Chunk Loader Placeholder */}
            {loadingMore && (
              <div className="mt-8">
                <ProductGridSkeleton cols={cols} count={4} />
              </div>
            )}

            {/* Sentinel for Infinite Scroll */}
            {sentinelRef && <div ref={sentinelRef} className="h-10 w-full" />}
          </>
        )}
      </section>
    </main>
  )
}
