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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={closeAddToCartModal}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-surface-dim z-10 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-surface-dim flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              shopping_bag
            </span>
            <h3 className="font-title-md text-on-surface font-semibold">
              Параметры товара
            </h3>
          </div>
          <button
            type="button"
            onClick={closeAddToCartModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Product Overview Card */}
          <div className="flex gap-4 p-3 rounded-2xl bg-surface-container-low border border-surface-dim items-center">
            <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-surface-variant border border-surface-dim">
              <img
                src={productToConfigure.image}
                alt={productToConfigure.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-0.5">
                {productToConfigure.brand || 'Belkson'}
              </span>
              <h4 className="font-title-sm text-on-surface line-clamp-2 leading-snug">
                {productToConfigure.name}
              </h4>
              <p className="font-title-md text-primary font-bold mt-1">
                {format(productToConfigure.priceRub)}
              </p>
            </div>
          </div>

          {/* Color Selection */}
          {availableColors.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-on-surface-variant block font-medium">
                Цвет: <span className="text-on-surface font-semibold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((col) => {
                  const isSelected = selectedColor === col
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary border-primary font-semibold shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant border-surface-dim hover:border-primary/50'
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
            <label className="text-xs text-on-surface-variant block font-medium">
              Выберите размер: <span className="text-on-surface font-semibold">{selectedSize}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`px-3.5 py-2 text-xs rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                        : 'bg-surface-container-low text-on-surface border-surface-dim hover:border-primary/50 font-medium'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            {!selectedSize && (
              <p className="text-[11px] text-error font-medium">
                Пожалуйста, выберите размер
              </p>
            )}
          </div>

          {/* Quantity Selection */}
          <div className="space-y-2 pt-2 border-t border-surface-dim">
            <label className="text-xs text-on-surface-variant block font-medium">
              Количество:
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-surface-dim rounded-full bg-surface-container-low p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-primary font-bold hover:bg-surface transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center font-bold text-on-surface tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-primary font-bold hover:bg-surface transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">
                Итого за товар: <strong className="text-on-surface">{format(totalPrice)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-surface-dim bg-surface-container-lowest flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeAddToCartModal}
            className="px-5 py-3 rounded-full border border-surface-dim text-xs font-semibold text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSize}
            className="px-6 py-3 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-on-primary-fixed-variant transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
            Добавить в корзину ({format(totalPrice)})
          </button>
        </div>
      </div>
    </div>
  )
}
