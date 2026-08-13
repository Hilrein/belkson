import type { MouseEvent } from 'react'
import type { CatalogProduct } from '../../store/catalog'
import { useCatalog } from '../../store/CatalogContext'

interface StorefrontProductCardProps {
  product: CatalogProduct
  onQuickView?: (product: CatalogProduct) => void
  onAddToCart: (product: CatalogProduct, e?: MouseEvent) => void
}

export function StorefrontProductCard({
  product,
  onQuickView,
  onAddToCart,
}: StorefrontProductCardProps) {
  const { format } = useCatalog()

  // Single parameter string for the product (e.g. Color or primary size)
  const singleParam =
    product.color ||
    (product.sizes && product.sizes.length > 0 ? `Размер: ${product.sizes[0]}` : '') ||
    product.category ||
    ''

  return (
    <div
      onClick={() => onQuickView?.(product)}
      className="group flex flex-col cursor-pointer h-full"
    >
      {/* Product Image Container — Matching HomePage aspect-[3/4] & rounded-2xl */}
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-3.5 bg-surface-container-low shadow-xs group-hover:shadow-md transition-shadow shrink-0">
        <img
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          src={product.image}
          loading="lazy"
        />

        {/* Badges */}
        {product.isSale && (
          <div className="absolute top-3 left-3 bg-[#ce7ed5] text-white text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide z-10 shadow-xs">
            SALE
          </div>
        )}
        {product.isNew && !product.isSale && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-primary text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide z-10 shadow-xs">
            NEW
          </div>
        )}

        {/* Desktop Overlay Button */}
        <button
          type="button"
          onClick={(e) => onAddToCart(product, e)}
          className="hidden md:block absolute inset-x-0 bottom-0 z-10 py-3 bg-primary text-on-primary text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 cursor-pointer"
        >
          В корзину
        </button>
      </div>

      {/* Content — Single Parameter & Price */}
      <div className="flex flex-col gap-1 px-1 flex-1">
        {product.brand && (
          <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-on-surface-variant">
            {product.brand}
          </p>
        )}
        <h3 className="font-body-lg text-body-lg text-on-surface font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Single product parameter */}
        {singleParam && (
          <p className="text-on-surface-variant text-xs truncate">{singleParam}</p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {product.isSale && product.salePriceRub ? (
            <div className="flex flex-col items-start tabular-nums">
              <span className="text-[11px] font-normal text-on-surface-variant/70 line-through">
                {format(product.priceRub)}
              </span>
              <span className="font-bold text-[#6f2879] text-sm md:text-base">
                {format(product.salePriceRub)}
              </span>
            </div>
          ) : (
            <span className="font-body-lg text-body-lg text-primary font-bold">
              {format(product.priceRub)}
            </span>
          )}

          {/* Mobile inline button */}
          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="md:hidden shrink-0 text-[11px] tracking-[0.12em] uppercase font-semibold text-primary border-b border-primary/40 pb-0.5 cursor-pointer"
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  )
}
