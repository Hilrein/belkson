import { useState, type MouseEvent } from 'react'
import type { Product } from '../../types/shop'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product, color: string, qty?: number, e?: MouseEvent) => void
  onQuickView?: (product: Product) => void
  addedId?: string | null
}

const showProductLink = import.meta.env.VITE_SHOW_PRODUCT === 'true'

const CATEGORY_LABELS: Record<string, string> = {
  girl: 'Девочки',
  boy: 'Мальчики',
  baby_girl: 'Малышки',
  baby_boy: 'Малыши',
  mini: 'Новорожденные',
  shoes_acc: 'Обувь & Аксессуары',
  all: 'Zara Kids',
}

function getColorHex(colorName: string): string {
  const c = colorName.toLowerCase()
  if (c.includes('песочный') || c.includes('sand') || c.includes('beige') || c.includes('бежевый')) return '#d7c4b7'
  if (c.includes('синий') || c.includes('blue') || c.includes('navy')) return '#1e293b'
  if (c.includes('молочный') || c.includes('cream') || c.includes('ecru') || c.includes('white') || c.includes('белый')) return '#f8fafc'
  if (c.includes('черный') || c.includes('black')) return '#18181b'
  if (c.includes('красный') || c.includes('red') || c.includes('fuchsia') || c.includes('фуксия')) return '#e11d48'
  if (c.includes('зеленый') || c.includes('green') || c.includes('khaki') || c.includes('хаки')) return '#15803d'
  if (c.includes('розовый') || c.includes('pink')) return '#f472b6'
  if (c.includes('желтый') || c.includes('yellow')) return '#eab308'
  if (c.includes('серый') || c.includes('grey') || c.includes('gray')) return '#94a3b8'
  return '#cbd5e1'
}

export function ProductCard({
  product,
  onAddToCart,
  onQuickView,
  addedId,
}: ProductCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0)
  const [hoveredColorIndex, setHoveredColorIndex] = useState<number | null>(null)

  const isAdded = addedId === product.id

  const colorsList = product.colors.length > 0 ? product.colors : ['Стандартный']
  const activeColorIndex = hoveredColorIndex !== null ? hoveredColorIndex : selectedColorIndex
  const currentColorName = colorsList[activeColorIndex] || colorsList[0]

  // Image resolution logic based on active color swatch
  const activeVariant =
    product.variants?.[activeColorIndex] ||
    product.variants?.find((v) => v.color.toLowerCase() === currentColorName.toLowerCase())

  const activeImages =
    activeVariant?.images && activeVariant.images.length > 0
      ? activeVariant.images
      : product.images

  // Primary image is ALWAYS activeImages[0] (first main front product photo)
  const activeImage = activeImages[0] || product.images[0]

  const categoryLabel = CATEGORY_LABELS[product.category] || 'Zara Kids'

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onAddToCart(product, currentColorName, 1, e)
  }

  const handleCardClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onQuickView) onQuickView(product)
  }

  return (
    <article
      onClick={handleCardClick}
      className="group flex flex-col cursor-pointer"
      onMouseLeave={() => setHoveredColorIndex(null)}
    >
      {/* Image container — editorial aspect-[3/4] matching CatalogPage.tsx */}
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-3 md:mb-4 rounded-xl md:rounded-none">
        <img
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          alt={product.title}
          src={activeImage}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Editorial Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-primary bg-surface/90 px-2 py-1 shadow-xs flex items-center gap-1">
            <span>{categoryLabel}</span>
          </span>
          {product.isSale && (
            <span className="text-[10px] tracking-[0.12em] uppercase font-bold text-white bg-[#ce7ed5] px-2 py-1 shadow-xs rounded-xs">
              Sale
            </span>
          )}
          {product.isNew && !product.isSale && (
            <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-primary bg-surface/90 px-2 py-1">
              New
            </span>
          )}
        </div>

        {/* Desktop Overlay CTA Button — matching CatalogPage.tsx */}
        <button
          type="button"
          onClick={handleAdd}
          className={`hidden md:block absolute inset-x-0 bottom-0 py-3 text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 ${
            isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          {isAdded ? 'Добавлено ✓' : 'В корзину'}
        </button>
      </div>

      {/* Content — matching CatalogPage.tsx */}
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm md:text-[15px] font-medium text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {product.title}
          </h2>
          <div className="flex flex-col items-end shrink-0 tabular-nums">
            {product.isSale && product.salePriceRub ? (
              <>
                <span className="text-[11px] md:text-xs font-normal text-on-surface-variant/70 line-through">
                  {product.priceRub.toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-sm md:text-[15px] font-bold text-[#6f2879]">
                  {product.salePriceRub.toLocaleString('ru-RU')} ₽
                </span>
              </>
            ) : (
              <span className="text-sm md:text-[15px] font-medium text-primary">
                {product.priceRub.toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
        </div>

        {/* Subtitle row with color name & original price */}
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>
            {currentColorName} · ({product.originalPrice} {product.currencySymbol})
          </span>

          {/* Color Swatches */}
          {colorsList.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {colorsList.map((c, idx) => {
                const isActive = activeColorIndex === idx
                const hex = getColorHex(c)
                return (
                  <button
                    key={idx}
                    type="button"
                    title={c}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedColorIndex(idx)
                    }}
                    onMouseEnter={() => setHoveredColorIndex(idx)}
                    onMouseLeave={() => setHoveredColorIndex(null)}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      isActive
                        ? 'ring-1 ring-primary ring-offset-1 border-primary scale-110'
                        : 'border-surface-dim opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Debug feature: Show original link to Zara if enabled */}
        {showProductLink && product.originalUrl && (
          <a
            href={product.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 text-[10px] tracking-[0.12em] uppercase font-semibold text-primary hover:underline flex items-center gap-1"
            title="Открыть оригинальную страницу товара на сайте магазина"
          >
            <span>Показать в магазине</span>
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </a>
        )}

        {/* Mobile Inline CTA */}
        <button
          type="button"
          onClick={handleAdd}
          className={`md:hidden mt-2 self-start text-[11px] tracking-[0.12em] uppercase font-semibold pb-0.5 ${
            isAdded
              ? 'text-emerald-600 border-b border-emerald-600'
              : 'text-primary border-b border-primary/40'
          }`}
        >
          {isAdded ? 'Добавлено ✓' : 'В корзину'}
        </button>
      </div>
    </article>
  )
}
