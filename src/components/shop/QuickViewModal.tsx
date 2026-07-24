import { useState, type MouseEvent } from 'react'
import type { Product } from '../../types/shop'

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
  const [quantity, setQuantity] = useState<number>(1)

  if (!product) return null

  const colorsList = product.colors.length > 0 ? product.colors : ['Стандартный']
  const currentColor = colorsList[selectedColorIndex] || colorsList[0]

  const activeVariant =
    product.variants?.[selectedColorIndex] ||
    product.variants?.find((v) => v.color.toLowerCase() === currentColor.toLowerCase())

  const activeImages =
    activeVariant?.images && activeVariant.images.length > 0
      ? activeVariant.images
      : product.images

  const currentImage = activeImages[activeImageIndex] || activeImages[0] || product.images[0] || ''
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      {/* Editorial Glassmorphism Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Dialog container — matching CatalogPage.tsx editorial style */}
      <div className="relative w-full max-w-4xl bg-surface shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[92vh] border border-surface-dim/80">
        {/* Minimalist Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 bg-surface/80 hover:bg-primary hover:text-white text-on-surface rounded-full flex items-center justify-center transition-all shadow-sm border border-surface-dim/40"
          aria-label="Закрыть"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Left: Gallery Column */}
        <div className="w-full md:w-1/2 bg-surface-container-low/40 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-surface-dim/60">
          <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-4 shadow-xs">
            <img
              src={currentImage}
              alt={product.title}
              className="w-full h-full object-cover object-center transition-all duration-500"
            />
            <span className="absolute top-3 left-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-primary bg-surface/90 px-2.5 py-1 flex items-center gap-1.5 shadow-xs">
              <span>{categoryLabel}</span>
            </span>
          </div>

          {/* Thumbnails */}
          {activeImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {activeImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-18 overflow-hidden shrink-0 border transition-all ${
                    activeImageIndex === idx
                      ? 'border-primary ring-1 ring-primary shadow-xs opacity-100 scale-95'
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
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
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
          <h2 className="text-xl md:text-2xl font-headline-md font-semibold text-on-surface mb-3 leading-snug tracking-tight">
            {product.title}
          </h2>

          {/* Price Row */}
          <div className="flex items-baseline gap-3 mb-5 pb-4 border-b border-surface-dim/60">
            <span className="text-2xl md:text-3xl font-semibold text-primary tabular-nums">
              {product.priceRub.toLocaleString('ru-RU')} ₽
            </span>
            {product.brand !== 'belkson' && (
              <span className="text-xs md:text-sm text-on-surface-variant tabular-nums">
                (Официально {brandName}: {product.originalPrice} {product.currencySymbol})
              </span>
            )}
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
                    className={`py-1.5 px-3 rounded-full text-xs font-medium border flex items-center gap-2 transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary'
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

          {/* Quantity Selector & Add to Cart CTA */}
          <div className="mt-auto pt-5 border-t border-surface-dim/60 flex items-center gap-3">
            {/* Minimalist Quantity selector */}
            <div className="flex items-center border border-surface-dim/80 bg-surface py-1 px-2">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center text-xs sm:text-sm font-semibold text-on-surface tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
              >
                +
              </button>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 py-3.5 px-6 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container text-xs tracking-[0.14em] uppercase font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              В корзину ({(product.priceRub * quantity).toLocaleString('ru-RU')} ₽)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
