import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from './store/CatalogContext'
import { useCart } from './store/CartContext'
import { usePurchaseTerms } from './store/PurchaseTermsContext'
import { useHeroBanners } from './store/HeroBannersContext'
import type { CatalogProduct } from './store/catalog'

/**
 * Home page content only — chrome (navbar/footer/cart) lives in StorefrontLayout.
 */
export default function HomePage() {
  const { newArrivals, favorites, format } = useCatalog()
  const { openAddToCartModal } = useCart()
  const { variants } = usePurchaseTerms()
  const { banners: allBanners } = useHeroBanners()

  const activeBanners = allBanners.filter((b) => b.isActive)
  const heroSlideCount = activeBanners.length > 0 ? activeBanners.length : 1

  const [heroIndex, setHeroIndex] = useState(0)
  const newArrivalsRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    touchEndXRef.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return
    const distance = touchStartXRef.current - touchEndXRef.current
    const minSwipeDistance = 40
    if (distance > minSwipeDistance) {
      setHeroIndex((i) => (i + 1) % heroSlideCount)
    } else if (distance < -minSwipeDistance) {
      setHeroIndex((i) => (i - 1 + heroSlideCount) % heroSlideCount)
    }
  }

  const handleAddToCart = useCallback(
    (product: CatalogProduct, e?: MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      const finalProduct = product.isSale && product.salePriceRub ? { ...product, priceRub: product.salePriceRub } : product
      openAddToCartModal(finalProduct)
    },
    [openAddToCartModal],
  )

  const scrollNewArrivals = useCallback((direction: number) => {
    const container = newArrivalsRef.current
    if (!container) return
    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (heroSlideCount <= 1) return
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlideCount)
    }, 6000)
    return () => window.clearInterval(id)
  }, [heroSlideCount])

  // Scroll to hash anchors when opened via shared navbar (/#novinki etc.)
  useEffect(() => {
    if (!window.location.hash) return
    const id = window.location.hash.slice(1)
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <main>
      {/* Hero — photo + refined copy (soft local glow, elegant btn) */}
      <section
        className="relative w-full overflow-hidden h-[560px] md:h-[640px] bg-surface-container-low group/hero"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track h-full w-full transition-transform duration-700 ease-out"
          id="hero-carousel"
          style={{ transform: `translateX(-${heroIndex * 100}%)` }}
        >
          {activeBanners.map((slide) => (
            <div key={slide.id} className="w-full h-full flex-shrink-0 relative">
              <img
                className="w-full h-full object-cover object-[center_28%]"
                alt={slide.title}
                src={slide.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-end">
                <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pb-8 md:pb-12">
                  <div className="hero-copy">
                    {slide.badge && (
                      <span className="text-[11px] tracking-[0.2em] uppercase font-bold text-white/80 block mb-1.5">
                        {slide.badge}
                      </span>
                    )}
                    <h1 className="hero-title">{slide.title}</h1>
                    {slide.subtitle && <p className="hero-lead">{slide.subtitle}</p>}
                    {slide.buttonText && (
                      <div className="hero-actions">
                        <Link
                          to={slide.buttonUrl || '/catalog'}
                          className="btn-hero group/btn"
                        >
                          <span>{slide.buttonText}</span>
                          <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Side navigation arrows for desktop */}
        {heroSlideCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i - 1 + heroSlideCount) % heroSlideCount)}
              className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/70 hover:bg-white text-on-surface backdrop-blur-md items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer opacity-0 group-hover/hero:opacity-100"
              aria-label="Предыдущий слайд"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setHeroIndex((i) => (i + 1) % heroSlideCount)}
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/70 hover:bg-white text-on-surface backdrop-blur-md items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer opacity-0 group-hover/hero:opacity-100"
              aria-label="Следующий слайд"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </>
        )}

        {/* Glassmorphic pagination bar */}
        {heroSlideCount > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-white/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/50 shadow-2xs">
            {Array.from({ length: heroSlideCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroIndex(idx)}
                aria-label={`Слайд ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  heroIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-neutral-400/60 hover:bg-neutral-600'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Category row — quiet fashion nav under hero */}
      <section className="border-b border-surface-dim/70 bg-background">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-5 md:py-6">
          <div className="flex gap-x-6 sm:gap-x-8 gap-y-2 overflow-x-auto hide-scroll max-w-full items-center justify-start md:justify-center">
            {(
              [
                { to: '/catalog', label: 'Вся одежда' },
                { to: '/catalog?category=Малыши', label: 'Малыши' },
                { to: '/catalog?category=Девочки', label: 'Девочки' },
                { to: '/catalog?category=Мальчики', label: 'Мальчики' },
                { to: '/catalog?category=new', label: 'Новинки' },
              ] as const
            ).map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  'shrink-0 text-[13px] sm:text-sm transition-colors ' +
                  (i === 0
                    ? 'font-semibold text-primary'
                    : 'font-medium text-on-surface-variant hover:text-primary')
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* Новинки (New Arrivals Carousel) */}
      <section id="novinki" className="scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))] max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
      <div className="flex justify-between items-end mb-10">
      <div>
      <h2 className="font-headline-md text-headline-md text-primary mb-2">Новинки</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">Свежие поступления в нашем премиальном каталоге.</p>
      </div>
      <div className="hidden md:flex gap-3">
      <button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors text-primary" onClick={() => scrollNewArrivals(-1)}>
      <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors text-primary" onClick={() => scrollNewArrivals(1)}>
      <span className="material-symbols-outlined">arrow_forward</span>
      </button>
      </div>
      </div>
      <div className="overflow-x-auto hide-scroll flex items-stretch gap-6 pb-6 snap-x snap-mandatory" id="new-arrivals-container" ref={newArrivalsRef} style={{ scrollBehavior: 'smooth' }}>
      {newArrivals.length === 0 ? (
        <p className="text-on-surface-variant py-8">Пока нет новинок. Добавьте товары в админке.</p>
      ) : (
        newArrivals.map((product) => (
      <div
        key={product.id}
        className="w-[260px] sm:w-[280px] md:w-[300px] shrink-0 snap-start flex flex-col group cursor-pointer"
      >
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-surface-container-low shadow-sm group-hover:shadow-md transition-shadow shrink-0">
      <img
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        src={product.image}
      />
      {product.isNew && (
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-primary text-xs px-3 py-1.5 rounded-full font-label-sm font-bold tracking-wide z-10">
                              NEW
                          </div>
      )}
      <button
        type="button"
        onClick={(e) => handleAddToCart(product, e)}
        className="hidden md:block absolute inset-x-0 bottom-0 z-10 py-3 bg-primary text-on-primary text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
      >
        В корзину
      </button>
      </div>
      <div className="flex flex-col gap-1 px-1 min-h-[5.5rem] flex-1">
      <h3 className="font-body-lg text-body-lg text-on-surface font-semibold line-clamp-2 leading-snug">{product.name}</h3>
      <p className="text-on-surface-variant text-sm truncate">{product.color}</p>
      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
        {product.isSale && product.salePriceRub ? (
          <div className="flex flex-col items-start tabular-nums">
            <span className="text-[11px] font-normal text-on-surface-variant/70 line-through">
              {format(product.priceRub)}
            </span>
            <span className="font-bold text-[#6f2879] text-base">
              {format(product.salePriceRub)}
            </span>
          </div>
        ) : (
          <span className="font-body-lg text-body-lg text-primary font-bold">{format(product.priceRub)}</span>
        )}
        <button
          type="button"
          onClick={(e) => handleAddToCart(product, e)}
          className="md:hidden shrink-0 text-[11px] tracking-[0.12em] uppercase font-semibold text-primary border-b border-primary/40 pb-0.5"
        >
          В корзину
        </button>
      </div>
      </div>
      </div>
        ))
      )}
      </div>
      </section>
      {/* Our Favorites */}
      <section id="lyubimchiki" className="scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))] max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim">
      <div className="flex justify-between items-end mb-10">
      <div>
      <h2 className="font-headline-md text-headline-md text-primary mb-2">Наши любимчики</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">Вещи, которые все обожают прямо сейчас.</p>
      </div>
      <Link to="/catalog" className="hidden md:flex items-center gap-2 text-primary font-label-sm text-label-sm hover:text-on-primary-container transition-colors">
                      Показать все <span className="material-symbols-outlined">arrow_forward</span>
      </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {favorites.length === 0 ? (
        <p className="text-on-surface-variant col-span-full py-4">Пока нет любимчиков. Отметьте товары в админке.</p>
      ) : (
        favorites.map((product) => (
      <div key={product.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_10px_30px_-15px_rgba(138,65,147,0.08)] hover:shadow-[0_20px_40px_-12px_rgba(138,65,147,0.12)] transition-all duration-300 group cursor-pointer border border-transparent hover:border-surface-dim">
      <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-4 bg-surface-container-low">
      <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" alt={product.name} src={product.image} />
      <button type="button" className="absolute top-3 right-3 z-20 w-10 h-10 bg-surface/80 backdrop-blur-sm rounded-full flex items-center justify-center text-outline hover:text-error transition-colors" aria-label="В избранное">
      <span className="material-symbols-outlined">favorite</span>
      </button>
      {product.badge && product.badge !== 'NEW' && (
      <div className="absolute bottom-12 left-3 z-10 bg-secondary-container text-on-secondary-container text-xs px-3 py-1.5 rounded-full font-label-sm font-bold md:bottom-3 group-hover:md:bottom-14 transition-all duration-300">
                              {product.badge}
                          </div>
      )}
      <button
        type="button"
        onClick={(e) => handleAddToCart(product, e)}
        className="hidden md:block absolute inset-x-0 bottom-0 z-10 py-3 bg-primary text-on-primary text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
      >
        В корзину
      </button>
      </div>
      <div className="flex flex-col gap-3">
      <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
      <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1 line-clamp-2">{product.name}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant text-sm">{product.color}</p>
      </div>
      {product.isSale && product.salePriceRub ? (
        <div className="flex flex-col items-end shrink-0 tabular-nums">
          <span className="text-[11px] font-normal text-on-surface-variant/70 line-through">
            {format(product.priceRub)}
          </span>
          <span className="font-bold text-[#6f2879] text-base">
            {format(product.salePriceRub)}
          </span>
        </div>
      ) : (
        <span className="font-body-lg text-body-lg text-primary font-bold shrink-0">{format(product.priceRub)}</span>
      )}
      </div>
      <button
        type="button"
        onClick={(e) => handleAddToCart(product, e)}
        className="md:hidden self-start text-[11px] tracking-[0.12em] uppercase font-semibold text-primary border-b border-primary/40 pb-0.5"
      >
        В корзину
      </button>
      </div>
      </div>
        ))
      )}
      </div>
      <Link to="/catalog" className="md:hidden w-full mt-8 bg-surface-variant text-on-surface font-label-sm text-label-sm py-4 rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors text-center block">
                  Показать все любимчики
              </Link>
      </section>
      {/* Feature blocks - catalog style: photo + text, no overlay chrome */}
      <section id="prochee" className="scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))] max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-stretch">
          {/* Collection: image on top, copy below (real shop layout) */}
          <article className="md:col-span-8 flex flex-col rounded-2xl overflow-hidden bg-surface-container-lowest border border-surface-dim">
            <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden bg-surface-container-low">
              <img
                className="w-full h-full object-cover object-center"
                alt="Девочка в лавандовом жакете"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCcIoQstGiOoJsMha05qt-pi349QXUPBjNWLU-2s49dciEvoFl57vggXvK6J6EH9iyk6QZ2cfwKYheAz5kBYR0AOtjWwR4v_UsxNqxwQsJa7sFCbRMloAb-Yx04owsdwUXHC8VD8ug1TJEyOlcuOAdgkhRrRLGSbAaZjwME82bZDf-BKuNjuqV7PiJRg9MCi3H8yJCe-4owZdsYLAX-YB8Bz6I4gBzcHKiAE5CRzPxertAFZesXtzXVzA1sMm2LuDZYvbUW9ZpGAQu"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 p-6 md:p-8">
              <div className="max-w-md">
                <p className="text-sm text-primary mb-1.5">Новая коллекция</p>
                <h3 className="font-headline-md text-xl md:text-2xl text-on-surface mb-2">
                  Коллекция для переменки
                </h3>
                <p className="text-on-surface-variant text-[15px] leading-relaxed">
                  Одежда для приключений из экологичных и прочных тканей.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 self-start sm:self-auto bg-primary text-on-primary text-sm font-medium px-6 py-3 rounded-full hover:bg-on-primary-fixed-variant transition-colors"
              >
                Смотреть коллекцию
              </button>
            </div>
          </article>

          {/* Side stack */}
          <div className="md:col-span-4 flex flex-col gap-5 md:gap-6">
            {/* Materials note - product-fact style, not empty marketing card */}
            <article className="flex-1 rounded-2xl border border-surface-dim bg-surface-container-lowest p-6 md:p-7 flex flex-col justify-center">
              <h3 className="text-base md:text-lg font-medium text-on-surface mb-4">
                С заботой о планете
              </h3>
              <ul className="text-[15px] text-on-surface-variant leading-relaxed">
                <li className="py-2.5 border-b border-surface-dim">
                  Органический хлопок
                </li>
                <li className="py-2.5 border-b border-surface-dim">
                  Без агрессивных красителей
                </li>
                <li className="pt-2.5">
                  Мягко для чувствительной кожи
                </li>
              </ul>
            </article>

            <article className="flex-1 rounded-2xl overflow-hidden border border-surface-dim bg-surface-container-lowest">
              <div className="aspect-[4/3] overflow-hidden bg-surface-container-low">
                <img
                  className="w-full h-full object-cover object-center"
                  alt="Базовые вещи для малышей"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzfXQLCjEcOYa9JWefnJxVNtMvLW77hvpFU-BmxSFAJblnOkg2kDVj_ipKEcO19Gp6j7rjf7okmqUwjlf9JBeE44txITjk8ge7lKAVPCWjvMhYz_xHzqHbWeOWZBvYTmomsPaeXXrmt_5PbSQ8LjavhTyA3GXovY9RaVwRhZM2pLTrJVSQCT-7vcWsQKesLEN-0h3zXilKIgvkwCBKS5bXQoxOAC6OQ2QoXttUxQV4bPS9dRDamgduZScmoYtxUg1DPSdhpUTa7O1B"
                />
              </div>
              <div className="p-5 md:p-6 flex items-center justify-between gap-3">
                <h3 className="font-headline-md text-base md:text-lg text-on-surface leading-snug">
                  Базовые вещи для малышей
                </h3>
                <a
                  href="#"
                  className="shrink-0 text-sm font-medium text-primary hover:text-on-primary-fixed-variant transition-colors"
                >
                  Купить
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>
      {/* Dynamic Purchase Terms Variants with original design styles restored */}
      <div id="usloviya-vykupa" className="scroll-mt-[calc(4rem+env(safe-area-inset-top,0px))]">
      {variants
        .filter((v) => v.isActive !== false)
        .map((variant, vIdx) => {
          const layoutStyle =
            variant.layout ||
            (variant.id === 'v1' || vIdx === 0
              ? 'list'
              : variant.id === 'v2' || vIdx === 1
                ? 'editorial'
                : 'icons')

          if (layoutStyle === 'list') {
            return (
              <section
                key={variant.id}
                className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim"
              >
                {variant.badge && (
                  <p className="text-sm text-on-surface-variant mb-1.5 text-center font-sans">
                    {variant.badge}
                  </p>
                )}
                <h2 className="font-headline-md text-headline-md text-primary mb-12 text-center">
                  {variant.title}
                </h2>
                <ol className="max-w-4xl mx-auto divide-y divide-surface-dim rounded-2xl bg-surface-container-low/40 border border-surface-dim overflow-hidden shadow-xs">
                  {variant.steps.map((step, i) => (
                    <li
                      key={step.id || step.title || i}
                      className={`grid grid-cols-[3rem_1fr] md:grid-cols-[4.5rem_minmax(0,12rem)_1fr] gap-x-3 md:gap-x-6 gap-y-1 px-5 md:px-7 py-5 md:py-6 ${
                        i < variant.steps.length - 1 ? 'border-b border-surface-dim' : ''
                      }`}
                    >
                      <span className="text-sm text-primary tabular-nums pt-0.5 font-sans font-medium">
                        {step.stepLabel || String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-base md:text-lg font-medium text-on-surface">
                        {step.title}
                      </h3>
                      <p className="col-start-2 md:col-start-3 text-[15px] text-on-surface-variant leading-relaxed">
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )
          }

          if (layoutStyle === 'editorial') {
            return (
              <section
                key={variant.id}
                className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim"
              >
                {variant.badge && (
                  <p className="text-sm text-on-surface-variant mb-1.5 text-center font-sans">
                    {variant.badge}
                  </p>
                )}
                <h2 className="font-headline-md text-headline-md text-primary mb-12 text-center">
                  {variant.title}
                </h2>
                <div className="max-w-4xl mx-auto flex flex-col">
                  {variant.steps.map((step, i) => (
                    <div
                      key={step.id || step.title || i}
                      className={`py-8 border-t border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start ${
                        i % 2 === 1 ? 'bg-surface-container-low/50 px-4 sm:px-6 rounded-2xl' : ''
                      } ${i === variant.steps.length - 1 ? 'border-b' : ''}`}
                    >
                      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">
                        {step.stepLabel ? `${step.stepLabel}: ${step.title}` : step.title}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )
          }

          // Default / Style 3: Visual Narrative (Icons)
          return (
            <section
              key={variant.id}
              className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim overflow-hidden font-[EB_Garamond,Plus_Jakarta_Sans,sans-serif]"
            >
              {variant.badge && (
                <p className="text-sm text-on-surface-variant mb-1.5 text-center font-sans">
                  {variant.badge}
                </p>
              )}
              <h2 className="font-headline-md text-headline-md text-primary mb-12 sm:mb-16 text-center">
                {variant.title}
              </h2>
              <div className="relative">
                <div className="hidden md:block absolute top-10 left-0 w-full h-[1px] bg-outline-variant/30 z-0"></div>
                <div className="flex flex-col md:flex-row gap-8 overflow-x-auto hide-scroll relative z-10 pb-8 snap-x snap-mandatory w-full max-w-full px-0">
                  {variant.steps.map((step, idx) => {
                    const labelPrefix = step.stepLabel ? `${step.stepLabel}: ` : ''
                    const fullTitle = `${labelPrefix}${step.title}`
                    return (
                      <div
                        key={step.id || step.title || idx}
                        className="flex-1 min-w-[200px] snap-start group"
                      >
                        {step.icon && step.icon !== 'none' && step.icon.trim() !== '' && (
                          <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
                            <span className="material-symbols-outlined text-3xl font-light">
                              {step.icon}
                            </span>
                          </div>
                        )}
                        <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">
                          {fullTitle}
                        </h3>
                        <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
