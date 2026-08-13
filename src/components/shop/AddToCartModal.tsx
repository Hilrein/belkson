import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../../store/CartContext'
import { useCatalog } from '../../store/CatalogContext'
import { FullscreenImageViewer } from './FullscreenImageViewer'

const DEFAULT_CHILDREN_SIZES = [
  '56-62',
  '62-68',
  '74-80',
  '80-86',
  '86-92',
  '92-98',
  '98-104',
  '104-110',
]

type AddToCartModalProps = {
  onOpenCart?: () => void
}

export function AddToCartModal({ onOpenCart }: AddToCartModalProps) {
  const { productToConfigure, closeAddToCartModal, addToCart } = useCart()
  const { format } = useCatalog()

  const [quantity, setQuantity] = useState(1)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Drag down swipe gesture state for mobile sheet handle
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleHandleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY
    if (diff > 0) {
      setDragOffsetY(diff)
    }
  }

  const handleHandleTouchEnd = () => {
    if (dragOffsetY > 65) {
      closeAddToCartModal()
    }
    setTouchStartY(null)
    setDragOffsetY(0)
    setIsDragging(false)
  }

  const availableColors = useMemo(() => {
    if (!productToConfigure?.color || productToConfigure.color.trim() === '—') {
      return []
    }
    return productToConfigure.color
      .split(/[,/]/)
      .map((c) => c.trim())
      .filter(Boolean)
  }, [productToConfigure])

  useEffect(() => {
    if (productToConfigure) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      setQuantity(1)
      setDragOffsetY(0)
      const colors =
        productToConfigure.color && productToConfigure.color.trim() !== '—'
          ? productToConfigure.color.split(/[,/]/).map((c) => c.trim()).filter(Boolean)
          : []
      setSelectedColor(colors.length > 0 ? colors[0] : productToConfigure.color || '')

      const availSizes =
        productToConfigure.sizes && productToConfigure.sizes.length > 0
          ? productToConfigure.sizes
          : DEFAULT_CHILDREN_SIZES

      setSelectedSize(availSizes.length > 0 ? availSizes[0] : '')
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.touchAction = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [productToConfigure])

  if (!productToConfigure) return null

  const availableSizes =
    productToConfigure.sizes && productToConfigure.sizes.length > 0
      ? productToConfigure.sizes
      : DEFAULT_CHILDREN_SIZES

  const handleConfirm = () => {
    addToCart(productToConfigure, {
      qty: quantity,
      selectedColor,
      selectedSizes: selectedSize ? [selectedSize] : [],
    })
    closeAddToCartModal()
    if (onOpenCart) {
      onOpenCart()
    }
  }

  const totalPrice = productToConfigure.priceRub * quantity
  const imagesList = [
    productToConfigure.image,
    ...(productToConfigure.images || []),
  ].filter(Boolean)

  return (
    <>
      <FullscreenImageViewer
        isOpen={isFullscreen}
        images={imagesList}
        initialIndex={0}
        title={productToConfigure.name}
        colors={availableColors}
        selectedColorIndex={Math.max(0, availableColors.indexOf(selectedColor))}
        onSelectColor={(idx) => setSelectedColor(availableColors[idx] || '')}
        onClose={() => setIsFullscreen(false)}
      />

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-md transition-opacity duration-300"
        onTouchMove={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault()
          }
        }}
      >
        {/* Backdrop click */}
        <div
          className="absolute inset-0"
          onClick={closeAddToCartModal}
          onTouchMove={(e) => e.preventDefault()}
          aria-hidden="true"
        />

        {/* Modal Dialog Card — Enlarged max-w-xl sm:max-w-2xl on desktop */}
        <div
          className="relative w-full max-w-xl sm:max-w-2xl bg-surface/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col border border-white/60"
          style={{
            transform: `translateY(${dragOffsetY}px)`,
            transition: isDragging ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          {/* Top Handle Pill (Mobile Sheet Drag & Click Handle) */}
          <div
            className="pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing select-none touch-none bg-surface/80 backdrop-blur-md"
            onClick={closeAddToCartModal}
            onTouchStart={handleHandleTouchStart}
            onTouchMove={handleHandleTouchMove}
            onTouchEnd={handleHandleTouchEnd}
            title="Нажмите или смахните вниз, чтобы закрыть"
          >
            <div className="w-12 h-1.5 rounded-full bg-surface-dim hover:bg-on-surface-variant/40 active:bg-on-surface-variant/60 transition-colors" />
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeAddToCartModal}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-surface-variant/60 hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          {/* Body content */}
          <div className="p-5 sm:p-6 md:p-8 overflow-y-auto space-y-5">
            {/* Main Layout: Product Image + Details Grid */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              {/* Enlarged Vertical Product Image on Desktop */}
              <div
                className="relative w-28 sm:w-36 md:w-44 aspect-3/4 rounded-2xl overflow-hidden bg-surface-container-low border border-surface-dim/60 shrink-0 shadow-xs cursor-zoom-in group"
                onClick={() => setIsFullscreen(true)}
                title="Развернуть во весь экран"
              >
                <img
                  src={productToConfigure.image}
                  alt={productToConfigure.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFullscreen(true)
                  }}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                  title="Развернуть во весь экран"
                >
                  <span className="material-symbols-outlined text-sm">fullscreen</span>
                </button>
              </div>

            {/* Right Product Overview & Selectors */}
            <div className="flex-1 min-w-0 space-y-3.5 w-full">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.18em] block mb-0.5 opacity-90">
                  {productToConfigure.brand || 'BELKSON'}
                </span>
                <h3 className="text-xs sm:text-sm font-headline-md font-semibold text-on-surface leading-snug line-clamp-2">
                  {productToConfigure.name}
                </h3>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <p className="text-base sm:text-lg font-bold text-primary tabular-nums">
                    {format(productToConfigure.priceRub)}
                  </p>
                  {productToConfigure.stock != null && (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>В наличии: {productToConfigure.stock} шт.</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Color Selector */}
              {availableColors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                    <span>Цвет</span>
                    <span className="text-on-surface font-bold normal-case text-xs">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColors.map((col) => {
                      const isSelected = selectedColor === col
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColor(col)}
                          className={`px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ce7ed5] text-white border-[#ce7ed5] font-semibold shadow-xs'
                              : 'bg-surface-container-low text-on-surface border-surface-dim hover:border-[#ce7ed5]/60 font-medium'
                          }`}
                        >
                          {col}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                  <span>Размер</span>
                  {selectedSize && (
                    <span className="text-on-surface font-bold normal-case text-xs">{selectedSize}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`h-9 min-w-11 px-3 text-xs rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#ce7ed5] text-white border-[#ce7ed5] font-semibold shadow-xs'
                            : 'bg-surface-container-low text-on-surface border-surface-dim hover:border-[#ce7ed5]/60 font-medium'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-3 border-t border-surface-dim/60">
            <span className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
              Количество
            </span>
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-2xl border border-surface-dim">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-variant flex items-center justify-center text-on-surface disabled:opacity-40 disabled:hover:bg-surface transition-colors cursor-pointer"
                aria-label="Уменьшить количество"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <span className="w-8 text-center text-sm font-bold text-on-surface tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) =>
                    productToConfigure.stock != null ? Math.min(productToConfigure.stock, q + 1) : q + 1,
                  )
                }
                disabled={productToConfigure.stock != null && quantity >= productToConfigure.stock}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-variant flex items-center justify-center text-on-surface disabled:opacity-40 disabled:hover:bg-surface transition-colors cursor-pointer"
                aria-label="Увеличить количество"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Confirm Action */}
        <div className="p-4 sm:p-5 bg-surface/90 backdrop-blur-md border-t border-surface-dim/60 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
              Итого к покупке
            </span>
            <span className="text-base sm:text-xl font-bold text-primary tabular-nums">
              {format(totalPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSize}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-[#793782] text-on-primary text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between"
          >
            <span>В КОРЗИНУ</span>
            <span className="tabular-nums font-bold text-sm text-on-primary/95">
              {format(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  </>
)
}
