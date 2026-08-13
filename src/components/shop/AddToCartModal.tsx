import { useState, useEffect, useMemo } from 'react'
import { useCart } from '../../store/CartContext'
import { useCatalog } from '../../store/CatalogContext'

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
      setQuantity(1)
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={closeAddToCartModal}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col transition-all border border-neutral-100">
        {/* Top Handle Pill (Mobile Sheet Indicator) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-9 h-1 rounded-full bg-neutral-200" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAddToCartModal}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-neutral-100/80 hover:bg-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
          aria-label="Закрыть"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Body content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {/* Main Layout: Product Image + Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1flex] gap-5 items-start">
            {/* Left Product Image */}
            <div className="aspect-4/5 sm:w-35 w-full rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-100 shrink-0">
              <img
                src={productToConfigure.image}
                alt={productToConfigure.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Right Product Overview & Selectors */}
            <div className="space-y-4 min-w-0">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest block mb-1">
                  {productToConfigure.brand || 'BELKSON'}
                </span>
                <h3 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-2">
                  {productToConfigure.name}
                </h3>
                <p className="text-base font-bold text-neutral-900 mt-1.5 tabular-nums">
                  {format(productToConfigure.priceRub)}
                </p>
              </div>

              {/* Color Selector */}
              {availableColors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                    <span>Цвет</span>
                    <span className="text-neutral-900 font-bold normal-case text-xs">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColors.map((col) => {
                      const isSelected = selectedColor === col
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSelectedColor(col)}
                          className={`px-3 py-1.5 text-xs rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-neutral-900 text-white border-neutral-900 font-semibold shadow-xs'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200/80 hover:border-neutral-400 font-medium'
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
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                  <span>Размер</span>
                  {selectedSize && (
                    <span className="text-neutral-900 font-bold normal-case text-xs">{selectedSize}</span>
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
                        className={`h-9 min-w-11 px-3 text-xs rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 font-semibold shadow-xs'
                            : 'bg-neutral-50 text-neutral-800 border-neutral-200/80 hover:border-neutral-400 font-medium'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
                {!selectedSize && (
                  <p className="text-[11px] text-red-500 font-medium pt-0.5">
                    Пожалуйста, выберите размер
                  </p>
                )}
              </div>

              {/* Stepper Quantity */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block">
                  Количество
                </span>
                <div className="inline-flex items-center border border-neutral-200 rounded-xl bg-neutral-50 h-9 p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-full rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors text-sm font-semibold"
                    aria-label="Уменьшить"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-neutral-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-full rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors text-sm font-semibold"
                    aria-label="Увеличить"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 sm:px-7 sm:py-5 border-t border-neutral-100 bg-white">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSize}
            className="w-full py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between"
          >
            <span>В КОРЗИНУ</span>
            <span className="tabular-nums font-bold text-sm text-white/90">
              {format(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
