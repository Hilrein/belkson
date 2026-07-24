import { useState } from 'react'
import type {
  SortOption,
  ZaraMainCategory,
  ZaraSubcategory,
} from '../../types/zaraTaxonomy'
import { ZARA_SUBCATEGORIES } from '../../types/zaraTaxonomy'

interface ZaraKidsFilterBarProps {
  currentMainCategory?: ZaraMainCategory
  selectedSubcategory: ZaraSubcategory
  onSelectSubcategory: (sub: ZaraSubcategory) => void
  selectedSize: string
  onSelectSize: (size: string) => void
  availableSizes: string[]
  priceMinRub?: number
  priceMaxRub?: number
  onPriceChange: (min?: number, max?: number) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
  cols?: number
  onColsChange?: (c: number) => void
  totalCount: number
  onResetFilters?: () => void
  onResetAll?: () => void
}

export function ZaraKidsFilterBar({
  currentMainCategory = 'all',
  selectedSubcategory,
  onSelectSubcategory,
  selectedSize,
  onSelectSize,
  availableSizes,
  priceMinRub,
  priceMaxRub,
  onPriceChange,
  sortBy,
  onSortChange,
  searchQuery = '',
  onSearchChange,
  cols = 4,
  onColsChange,
  totalCount,
  onResetFilters,
  onResetAll,
}: ZaraKidsFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [minInput, setMinInput] = useState<string>(priceMinRub ? String(priceMinRub) : '')
  const [maxInput, setMaxInput] = useState<string>(priceMaxRub ? String(priceMaxRub) : '')

  const activeSubcats = ZARA_SUBCATEGORIES.filter(
    (s) =>
      s.id === 'all' ||
      currentMainCategory === 'all' ||
      s.parentCategories.includes(currentMainCategory)
  )

  const handleApplyPrice = () => {
    const min = minInput ? parseInt(minInput, 10) : undefined
    const max = maxInput ? parseInt(maxInput, 10) : undefined
    onPriceChange(min, max)
    setPriceOpen(false)
  }

  const handleReset = () => {
    if (onResetAll) onResetAll()
    else if (onResetFilters) onResetFilters()
    setMinInput('')
    setMaxInput('')
  }

  const hasActiveFilters =
    selectedSubcategory !== 'all' ||
    selectedSize !== 'all' ||
    Boolean(searchQuery.trim()) ||
    (priceMinRub !== undefined && priceMinRub > 0) ||
    (priceMaxRub !== undefined && priceMaxRub > 0)

  return (
    <div className="catalog-sticky-toolbar border-t border-b border-surface-dim/80 shadow-[0_1px_0_rgba(29,25,43,0.04)] mb-8">
      {/* Sticky Bar matching CatalogPage.tsx */}
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
          {/* Sort Dropdown */}
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
              onClick={() => onColsChange && onColsChange(Math.min(4, cols + 1))}
              className="w-7 h-7 flex items-center justify-center text-base leading-none text-on-surface hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface transition-colors"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Крупнее (меньше колонок)"
              disabled={cols <= 2}
              onClick={() => onColsChange && onColsChange(Math.max(2, cols - 1))}
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
            {/* Search Input */}
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

            {/* Subcategory Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activeSubcats.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubcategory(sub.id)}
                  className={`py-1 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    selectedSubcategory === sub.id
                      ? 'bg-primary text-on-primary border-primary shadow-xs font-semibold'
                      : 'bg-surface text-on-surface-variant border-surface-dim hover:border-on-surface-variant'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Size & Price Dropdowns */}
            <div className="flex items-center gap-3 pt-2 border-t border-surface-dim/40 flex-wrap">
              {/* Size Dropdown */}
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
                          onSelectSize('all')
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
                            onSelectSize(sz)
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

              {/* Price Dropdown */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
