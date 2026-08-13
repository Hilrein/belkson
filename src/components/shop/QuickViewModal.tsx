import { useState, type MouseEvent } from 'react'
import type { Product } from '../../types/shop'
import { FullscreenImageViewer } from './FullscreenImageViewer'

interface QuickViewModalProps {
  product: Product | null
  onClose: () => void
  onAddToCart: (product: Product, color: string, qty: number, e?: MouseEvent) => void
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

export function QuickViewModal({ product, onClose, onAddToCart }: QuickViewModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0)
  const [selectedSizeIndex, setSelectedSizeIndex] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  if (!product) return null

  const colorsList = product.colors.length > 0 ? product.colors : ['Стандартный']
  const currentColor = colorsList[selectedColorIndex] || colorsList[0]
  const sizesList = product.sizes.length > 0 ? product.sizes : ['Стандартный']
  const currentSize = sizesList[selectedSizeIndex] || sizesList[0]

  const activeVariant =
    product.variants?.[selectedColorIndex] ||
    product.variants?.find((v) => v.color.toLowerCase() === currentColor.toLowerCase())

  const activeImages =
    activeVariant?.images && activeVariant.images.length > 0
      ? activeVariant.images
      : product.images

  const categoryLabel = CATEGORY_LABELS[product.category] || 'Zara Kids'

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    onAddToCart(product, currentColor, quantity, e)
    onClose()
  }

  const handleSelectColor = (idx: number) => {
    setSelectedColorIndex(idx)
    setActiveImageIndex(0) // Strictly reset image index to 0 (first main photo)
  }

  const brandName = product.brand === 'belkson' ? 'Belkson' : product.brand === 'zara' ? 'Zara Kids' : String(product.brand).toUpperCase()

  return (
    <>
      <FullscreenImageViewer
        isOpen={isFullscreen}
        images={activeImages}
        initialIndex={activeImageIndex}
        title={product.title}
        colors={colorsList}
        selectedColorIndex={selectedColorIndex}
        onSelectColor={handleSelectColor}
        onClose={() => setIsFullscreen(false)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-md transition-opacity duration-300">
        {/* Backdrop click */}
        <div
          className="absolute inset-0"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog container — enlarged max-w-5xl lg:max-w-6xl for desktop */}
        <div className="relative w-full max-w-5xl lg:max-w-6xl bg-surface/95 backdrop-blur-xl rounded-[28px] shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[92vh] border border-white/60">
          {/* Minimalist Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-surface-variant/70 hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          {/* Left: Gallery Column — Enlarged gallery column (55% width on desktop) */}
          <div className="w-full md:w-[55%] lg:w-[58%] bg-surface-container-low/40 p-5 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-surface-dim/60">
            <div
              className="relative aspect-3/4 md:aspect-[4/5] lg:aspect-3/4 w-full max-h-[60vh] md:max-h-[68vh] overflow-hidden bg-surface mb-3 border border-surface-dim/60 shadow-xs rounded-2xl group cursor-zoom-in"
              onClick={() => setIsFullscreen(true)}
              title="Нажмите, чтобы развернуть во весь экран"
            >
              <img
                src={activeImages[activeImageIndex] || product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-105"
              />
              <span className="absolute top-3 left-3 text-[10px] tracking-[0.14em] uppercase font-bold text-primary bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span>{categoryLabel}</span>
              </span>

              {/* Fullscreen zoom hint badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsFullscreen(true)
                }}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-md hover:scale-110 active:scale-95 cursor-pointer"
                title="Развернуть во весь экран"
              >
                <span className="material-symbols-outlined text-lg">fullscreen</span>
              </button>
            </div>

            {/* Thumbnails */}
            {activeImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {activeImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-20 md:w-18 md:h-24 overflow-hidden shrink-0 border transition-all rounded-xl cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-primary ring-2 ring-primary/40 shadow-xs opacity-100'
                        : 'border-surface-dim opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Right: Details & Options Column */}
        <div className="w-full md:w-[45%] lg:w-[42%] p-6 md:p-8 flex flex-col overflow-y-auto">
          {/* Header meta info */}
          <div className="flex items-center justify-between text-[11px] tracking-[0.12em] uppercase text-on-surface-variant mb-3 flex-wrap gap-2">
            <span>Артикул: {product.sku}</span>
            {showProductLink && product.originalUrl && (
              <a
                href={product.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold flex items-center gap-1"
                title={`Открыть оригинал на ${brandName}`}
              >
                <span>Показать в {brandName}</span>
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-headline-md font-bold text-on-surface mb-3 leading-snug tracking-tight">
            {product.title}
          </h2>

          {/* Price Row */}
          <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-surface-dim/60 flex-wrap">
            <div className="flex items-baseline gap-3">
              {product.isSale && product.salePriceRub ? (
                <>
                  <span className="text-sm md:text-base text-on-surface-variant/70 line-through font-normal tabular-nums">
                    {product.priceRub.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-[#6f2879] tabular-nums">
                    {product.salePriceRub.toLocaleString('ru-RU')} ₽
                  </span>
                </>
              ) : (
                <span className="text-2xl md:text-3xl font-bold text-primary tabular-nums">
                  {product.priceRub.toLocaleString('ru-RU')} ₽
                </span>
              )}
              {product.brand !== 'belkson' && (
                <span className="text-xs md:text-sm text-on-surface-variant tabular-nums">
                  (Официально {brandName}: {product.originalPrice} {product.currencySymbol})
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>В наличии: {product.stock != null ? product.stock : 10} шт.</span>
            </span>
          </div>

          {/* Description */}
          <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Color Swatches */}
          <div className="mb-6">
            <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-on-surface block mb-3">
              Цвет: <span className="text-primary normal-case font-medium">{currentColor}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {colorsList.map((c, idx) => {
                const isActive = selectedColorIndex === idx
                const hex = getColorHex(c)

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectColor(idx)}
                    className={`py-1.5 px-3.5 rounded-full text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#ce7ed5] bg-[#ce7ed5]/10 text-primary font-semibold shadow-xs ring-1 ring-[#ce7ed5]'
                        : 'border-surface-dim text-on-surface-variant hover:border-on-surface-variant'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-xs"
                      style={{ backgroundColor: hex }}
                    />
                    <span>{c}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Size Selector */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <span className="text-[11px] tracking-[0.14em] uppercase font-semibold text-on-surface block mb-3">
                Размер: <span className="text-primary normal-case font-medium">{currentSize}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {sizesList.map((size, idx) => {
                  const isActive = selectedSizeIndex === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSizeIndex(idx)}
                      className={`h-9 min-w-11 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#ce7ed5] bg-[#ce7ed5] text-white font-semibold shadow-xs'
                          : 'border-surface-dim text-on-surface-variant hover:border-primary/60'
                      }`}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Add to Cart CTA */}
          <div className="mt-auto pt-5 border-t border-surface-dim/60 flex items-center gap-3">
            {/* Minimalist Quantity selector */}
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-2xl border border-surface-dim">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-variant flex items-center justify-center text-on-surface disabled:opacity-40 transition-colors cursor-pointer"
              >
                −
              </button>
              <span className="w-8 text-center text-xs sm:text-sm font-bold text-on-surface tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-variant flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 py-3.5 px-6 rounded-full bg-[#8b2691] hover:bg-[#731b78] text-white text-xs tracking-[0.14em] uppercase font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              В корзину ({((product.isSale && product.salePriceRub ? product.salePriceRub : product.priceRub) * quantity).toLocaleString('ru-RU')} ₽)
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
)
}
