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
  '110-116',
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
      const colors = productToConfigure.color && productToConfigure.color.trim() !== '—'
        ? productToConfigure.color.split(/[,/]/).map((c) => c.trim()).filter(Boolean)
        : []
      setSelectedColor(colors.length > 0 ? colors[0] : (productToConfigure.color || ''))

      // Use product sizes if available, otherwise default to first available
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={closeAddToCartModal}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden z-10 max-h-[90vh] flex flex-col transition-all">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-surface-dim/60">
          <h3 className="text-sm font-semibold text-on-surface tracking-tight">
            Параметры товара
          </h3>
          <button
            type="button"
            onClick={closeAddToCartModal}
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/70 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Product Overview Card */}
          <div className="flex gap-3.5 items-center p-2.5 rounded-2xl bg-surface-container-lowest border border-surface-dim/70">
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-surface-variant border border-surface-dim/50">
              <img
                src={productToConfigure.image}
                alt={productToConfigure.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-on-surface line-clamp-1 leading-snug">
                {productToConfigure.name}
              </h4>
              {productToConfigure.brand && (
                <span className="text-[10px] text-on-surface-variant/70 block mt-0.5">
                  {productToConfigure.brand}
                </span>
              )}
              <p className="text-xs font-bold text-primary mt-1">
                {format(productToConfigure.priceRub)}
              </p>
            </div>
          </div>

          {/* Color Selection */}
          {availableColors.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-medium">Цвет</span>
                <span className="text-on-surface font-semibold">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((col) => {
                  const isSelected = selectedColor === col
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary font-medium shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant border-surface-dim/80 hover:border-primary/40'
                      }`}
                    >
                      {col}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant font-medium">Размер</span>
              {selectedSize && (
                <span className="text-on-surface font-semibold">{selectedSize}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-3.5 py-1.5 text-xs rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                        : 'bg-surface-container-low text-on-surface border-surface-dim/80 hover:border-primary/40 font-medium'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            {!selectedSize && (
              <p className="text-[11px] text-error font-medium">
                Выберите размер
              </p>
            )}
          </div>

          {/* Quantity Selection */}
          <div className="pt-3 border-t border-surface-dim/60 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">
              Количество
            </span>
            <div className="flex items-center gap-1 border border-surface-dim/80 rounded-full bg-surface-container-low p-0.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-primary font-bold hover:bg-surface transition-colors text-xs"
              >
                −
              </button>
              <span className="w-7 text-center font-semibold text-xs text-on-surface tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-primary font-bold hover:bg-surface transition-colors text-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-surface-dim/60 bg-surface">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSize}
            className="w-full py-3.5 px-4 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-all shadow-sm active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <span>Добавить в корзину</span>
            <span className="opacity-40">•</span>
            <span>{format(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
