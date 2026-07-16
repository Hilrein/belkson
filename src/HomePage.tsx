import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from './store/CatalogContext'
import { useCart } from './store/CartContext'
import type { CatalogProduct } from './store/catalog'
import { openTelegramOrder, getTelegramProfileUrl } from './lib/telegramOrder'
import { getInstagramProfileUrl } from './lib/instagram'
import { LoadingScreen } from './components/LoadingScreen'

/**
 * Pixel-faithful port of /static/index.html + script.js
 * Styling comes from Tailwind CDN (same config as static) + style.css utilities.
 */
export default function HomePage() {
  const { newArrivals, favorites, format, loading } = useCatalog()
  const {
    items: cartItems,
    totalCount,
    totalRub,
    addToCart,
    removeFromCart,
    setQuantity,
  } = useCart()
  const [navOpen, setNavOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)

  useEffect(() => {
    if (loading) {
      setSplashVisible(true)
      setSplashFading(false)
      return
    }
    // Catalog ready — fade splash out
    setSplashFading(true)
    const t = window.setTimeout(() => setSplashVisible(false), 450)
    return () => window.clearTimeout(t)
  }, [loading])

  const handleAddToCart = useCallback(
    (product: CatalogProduct, e?: MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      addToCart(product)
    },
    [addToCart],
  )
  const [searchOpen, setSearchOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const newArrivalsRef = useRef<HTMLDivElement>(null)
  const heroSlideCount = 2

  const toggleNavDrawer = useCallback(() => {
    setNavOpen((v) => !v)
  }, [])

  const toggleCart = useCallback(() => {
    setCartOpen((v) => !v)
  }, [])

  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open && searchRef.current) {
        searchRef.current.value = ''
        searchRef.current.blur()
      }
      return !open
    })
  }, [])

  const scrollNewArrivals = useCallback((direction: number) => {
    const container = newArrivalsRef.current
    if (!container) return
    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const locked = navOpen || cartOpen
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen, cartOpen])

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlideCount)
    }, 6000)
    return () => window.clearInterval(id)
  }, [])

  // Match static class toggling for overlays (same classes / transitions)
  const navOverlayClass =
    'fixed inset-0 z-50 flex justify-start' +
    (navOpen ? '' : ' pointer-events-none')
  const navBackdropClass =
    'absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out' +
    (navOpen ? ' opacity-100' : ' opacity-0')
  const navPanelClass =
    'relative w-full max-w-[350px] h-full bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out' +
    (navOpen ? ' translate-x-0' : ' -translate-x-full')

  const cartOverlayClass =
    'fixed inset-0 z-50 flex justify-end' +
    (cartOpen ? '' : ' pointer-events-none')
  const cartBackdropClass =
    'absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out' +
    (cartOpen ? ' opacity-100' : ' opacity-0')
  const cartPanelClass =
    'relative w-full max-w-md h-full bg-surface shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out' +
    (cartOpen ? ' translate-x-0' : ' translate-x-full')

  const searchInputClass =
    'absolute right-12 transition-all duration-300 ease-out bg-surface-container-low border border-outline-variant rounded-full py-2 px-4 focus:ring-2 focus:ring-primary-container focus:border-primary-container text-on-surface outline-none origin-right z-0 ' +
    (searchOpen
      ? 'w-48 md:w-64 opacity-100'
      : 'w-0 opacity-0')

  return (
    <>
      {splashVisible && <LoadingScreen fading={splashFading} />}
      {/* TopAppBar — fixed + solid fill (stable on mobile scroll; no blur/transform) */}
      <header className="site-header bg-surface shadow-sm">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto h-14">
      <div className="flex items-center gap-4">
      {/* Desktop & Mobile Menu Button */}
      <button className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150" onClick={toggleNavDrawer}>
      <span className="material-symbols-outlined text-primary">menu</span>
      </button>
      <a className="flex items-center gap-2 group" href="/">
      <img alt="Belkson Logo" className="shrink-0 object-contain w-8 h-8 group-hover:opacity-80 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRIGpaO5cyb72DuJFWmg7fxWR7x5H7FjUvJxjSPmGdAW8shR6cA3TIXynNwyAPvO5vV1K-Dwevw6XOSfPt-cMfFBA_bKImJDdmHNDekxBlxycmkG4ypq8lKktpdqH9KVy_aPMeS4PYPlbzeVFYIXqMy9wKri37ZUUZmdsSSAsP6dsweDFkmpKG6zV383BMuZn4iHw_31fDfw_t_7tEgUtcz0AXKxKaNuNl17EIb3e0jmXY9f7XZfKF0b6qwVyPoCZD7XkI9f7HOE2q" />
      <span className="font-display-lg-mobile text-primary font-bold text-xl tracking-tight hidden sm:block">Belkson</span>
      </a>
      </div>
      {/* Desktop Nav */}
      <nav className="hidden lg:flex items-center gap-6">
      <a className="text-primary font-normal border-b-2 border-primary pb-1" href="/">Главная</a>

      {/* Categories mega menu — centered under trigger, hover bridge via pt-2 */}
      <div className="relative group flex items-center">
      <button type="button" className="text-on-surface-variant font-normal hover:text-primary transition-colors duration-200 flex items-center gap-1 py-4">
        Категории
        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
      </button>
      <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-200">
      <div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 flex gap-8">
      <div className="flex-1 flex flex-col justify-center gap-4 py-2 min-w-0">
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#novinki">Новинки</a>
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#lyubimchiki">Топ распродаж</a>
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#prochee">Прочее</a>
      <hr className="my-2 border-[#ce7ed5]/30" />
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#">Девочки</a>
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#">Мальчики</a>
      <a className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium" href="#">Малыши</a>
      </div>
      <div className="w-[240px] xl:w-[280px] relative rounded-3xl overflow-hidden group/promo shrink-0 bg-surface-container-low aspect-[4/5]">
      <img alt="Promo" className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-700 opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent flex flex-col justify-end p-6">
      <h4 className="text-primary font-headline-md text-xl mb-1">Весенняя коллекция</h4>
      <a className="text-on-surface-variant text-sm font-medium flex items-center gap-1 hover:text-[#ce7ed5] transition-colors" href="#">Смотреть <span className="material-symbols-outlined text-[16px]">arrow_forward</span></a>
      </div>
      </div>
      </div>
      </div>
      </div>

      {/* Resale mega menu */}
      <div className="relative group flex items-center">
      <button type="button" className="text-on-surface-variant font-normal hover:text-primary transition-colors duration-200 flex items-center gap-1 py-4">
        Выкуп с официальных сайтов
        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
      </button>
      <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-200">
      <div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 xl:p-10 flex gap-6 xl:gap-8">
      <div className="flex-1 min-w-0">
      <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">Zara</h3>
      <ul className="flex flex-col gap-2">
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Spain</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">UK</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Poland</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Germany</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Kazakhstan</a></li>
      </ul>
      </div>
      <div className="flex-1 min-w-0">
      <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">H&amp;M</h3>
      <ul className="flex flex-col gap-2">
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">UK</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Germany</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Poland</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">USA</a></li>
      </ul>
      </div>
      <div className="flex-1 min-w-0">
      <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">Next</h3>
      <ul className="flex flex-col gap-2">
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">UK</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Kazakhstan</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Germany</a></li>
      <li><a className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal" href="#">Spain</a></li>
      </ul>
      </div>
      </div>
      </div>
      </div>
      </nav>
      <div className="flex items-center gap-2 text-primary dark:text-primary-fixed-dim">
      {/* Expanding Search Bar */}
      <div className="relative flex items-center justify-end" id="search-wrapper">
      <input ref={searchRef} className={searchInputClass} id="header-search-input" placeholder="Поиск..." type="text" />
      <button type="button" className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150 relative z-10 bg-surface" onClick={toggleSearch}>
      <span className="material-symbols-outlined">search</span>
      </button>
      </div>
      <button type="button" className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150 relative" onClick={toggleCart}>
      <span className="material-symbols-outlined">shopping_bag</span>
      {totalCount > 0 && (
      <span className="absolute top-1 right-1 bg-primary text-on-primary text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">
        {totalCount > 99 ? '99+' : totalCount}
      </span>
      )}
      </button>
      </div>
      </div>
      </header>
      <div className="site-header-spacer" aria-hidden="true" />
      <main>
      {/* Hero Carousel */}
      <section className="relative w-full overflow-hidden h-[600px] md:h-[700px] bg-surface-container-low">
      <div className="carousel-track h-full w-full" id="hero-carousel" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
      {/* Slide 1 */}
      <div className="w-full h-full flex-shrink-0 relative">
      <img className="w-full h-full object-cover" data-alt="A joyful, softly lit photograph of two young children..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent flex items-end">
      <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pb-12 md:pb-24">
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4 drop-shadow-sm">Весенняя нежность</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-lg">Откройте для себя нашу новую коллекцию невероятно уютных тканей для активных игр, созданных для маленьких исследователей.</p>
      <button className="bg-primary text-on-primary font-label-sm text-label-sm px-8 py-4 rounded-full shadow-[0_4px_10px_rgba(138,65,147,0.3)] border-b-[3px] border-on-primary-fixed-variant hover:bg-on-primary-fixed-variant transition-colors active:scale-[0.98] active:border-b-0 active:translate-y-[3px]">
                                  Купить новинки
                              </button>
      </div>
      </div>
      </div>
      {/* Slide 2 */}
      <div className="w-full h-full flex-shrink-0 relative">
      <img className="w-full h-full object-cover" data-alt="A close-up, high-quality photograph focusing on the texture of a soft, knitted children's sweater..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8XYOqM6k1V0yN9OxYE3KD3vUisD4kg3HENS3WhujMMEi1vweZXTfbqxf_gMVmXS3BxO3xhuNShDRdDGpgd_dC2YWaMLWhh9DaJoQymdWpGNX-7E3zC5JpTWwLPoqWwsZD46MK841lM3bvdLReNjLgKBzZOZDuQj6x8yCoihcD7f3TOr6gE1i-HO9NlZA9-TQfrglWzkecr7PxoNuovqPLQCtN8W5d1rQk7XGWDqLQwJiargBAigg616CwuYyRyCXzdpUihQVawbcF" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent flex items-end">
      <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop pb-12 md:pb-24">
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4 drop-shadow-sm">Создано для комфорта</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-lg">Премиальные материалы, которые ощущаются как объятия весь день напролет.</p>
      <button className="bg-primary text-on-primary font-label-sm text-label-sm px-8 py-4 rounded-full shadow-[0_4px_10px_rgba(138,65,147,0.3)] border-b-[3px] border-on-primary-fixed-variant hover:bg-on-primary-fixed-variant transition-colors active:scale-[0.98] active:border-b-0 active:translate-y-[3px]">
                                  Исследовать материалы
                              </button>
      </div>
      </div>
      </div>
      </div>
      {/* Carousel Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
      <button type="button" onClick={() => setHeroIndex(0)} className={`w-3 h-3 rounded-full transition-all duration-300 ${heroIndex === 0 ? 'bg-primary' : 'hover:bg-outline bg-outline-variant'}`} />
      <button type="button" onClick={() => setHeroIndex(1)} className={`w-3 h-3 rounded-full transition-all duration-300 ${heroIndex === 1 ? 'bg-primary' : 'hover:bg-outline bg-outline-variant'}`} />
      </div>
      </section>
      {/* Category Pills */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 overflow-x-auto hide-scroll">
      <div className="flex gap-4 min-w-max">
      <button className="bg-surface-variant text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">
                      Вся одежда
                  </button>
      <button className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-6 py-3 rounded-full shadow-sm">
                      Топы и футболки
                  </button>
      <button className="bg-surface-variant text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">
                      Брюки и легинсы
                  </button>
      <button className="bg-surface-variant text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">
                      Платья
                  </button>
      <button className="bg-surface-variant text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">
                      Верхняя одежда
                  </button>
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
        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        src={product.image}
      />
      {(product.badge === 'NEW' || product.isNew) && (
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-primary text-xs px-3 py-1.5 rounded-full font-label-sm font-bold tracking-wide z-10">
                              NEW
                          </div>
      )}
      </div>
      <div className="flex flex-col gap-1 px-1 min-h-[5.5rem] flex-1">
      <h3 className="font-body-lg text-body-lg text-on-surface font-semibold line-clamp-2 leading-snug">{product.name}</h3>
      <p className="text-on-surface-variant text-sm truncate">{product.color}</p>
      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
      <span className="font-body-lg text-body-lg text-primary font-bold">{format(product.priceRub)}</span>
      <button
        type="button"
        onClick={(e) => handleAddToCart(product, e)}
        className="shrink-0 text-xs font-semibold bg-primary text-on-primary px-3 py-1.5 rounded-full hover:bg-on-primary-fixed-variant transition-colors active:scale-[0.98]"
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
      <button className="hidden md:flex items-center gap-2 text-primary font-label-sm text-label-sm hover:text-on-primary-container transition-colors">
                      Показать все <span className="material-symbols-outlined">arrow_forward</span>
      </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {favorites.length === 0 ? (
        <p className="text-on-surface-variant col-span-full py-4">Пока нет любимчиков. Отметьте товары в админке.</p>
      ) : (
        favorites.map((product) => (
      <div key={product.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_10px_30px_-15px_rgba(138,65,147,0.08)] hover:shadow-[0_20px_40px_-12px_rgba(138,65,147,0.12)] transition-all duration-300 group cursor-pointer border border-transparent hover:border-surface-dim">
      <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-4 bg-surface-container-low">
      <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} src={product.image} />
      <button type="button" className="absolute top-3 right-3 w-10 h-10 bg-surface/80 backdrop-blur-sm rounded-full flex items-center justify-center text-outline hover:text-error transition-colors" aria-label="В избранное">
      <span className="material-symbols-outlined">favorite</span>
      </button>
      {product.badge && product.badge !== 'NEW' && (
      <div className="absolute bottom-3 left-3 bg-secondary-container text-on-secondary-container text-xs px-3 py-1.5 rounded-full font-label-sm font-bold">
                              {product.badge}
                          </div>
      )}
      </div>
      <div className="flex flex-col gap-3">
      <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
      <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1 line-clamp-2">{product.name}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant text-sm">{product.color}</p>
      </div>
      <span className="font-body-lg text-body-lg text-primary font-bold shrink-0">{format(product.priceRub)}</span>
      </div>
      <button
        type="button"
        onClick={(e) => handleAddToCart(product, e)}
        className="w-full text-sm font-semibold bg-primary text-on-primary py-2.5 rounded-full hover:bg-on-primary-fixed-variant transition-colors active:scale-[0.98]"
      >
        В корзину
      </button>
      </div>
      </div>
        ))
      )}
      </div>
      <button className="md:hidden w-full mt-8 bg-surface-variant text-on-surface font-label-sm text-label-sm py-4 rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors">
                  Показать все любимчики
              </button>
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
      {/* Variant 1: process list (same quiet catalog language) */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-14 md:py-20 border-t border-surface-dim">
        <div className="mb-8 md:mb-10">
          <p className="text-sm text-on-surface-variant mb-1.5">Вариант 1</p>
          <h2 className="font-headline-md text-headline-md text-primary">
            Порядок и условия выкупа
          </h2>
        </div>

        <ol className="rounded-2xl border border-surface-dim bg-surface-container-lowest overflow-hidden">
          {[
            {
              title: 'Выбор товара',
              text: 'Выбираете вещи на официальных сайтах Zara, H&M или Next.',
            },
            {
              title: 'Оформление заказа',
              text: 'Присылаете ссылки на товары в Telegram или Instagram.',
            },
            {
              title: 'Расчёт стоимости',
              text: 'Считаем итоговую сумму с доставкой и комиссией.',
            },
            {
              title: 'Оплата',
              text: 'Оплачиваете удобным способом.',
            },
            {
              title: 'Доставка',
              text: 'Выкупаем товар и доставляем вам.',
            },
          ].map((step, i) => (
            <li
              key={step.title}
              className={`grid grid-cols-[3rem_1fr] md:grid-cols-[4.5rem_minmax(0,12rem)_1fr] gap-x-3 md:gap-x-6 gap-y-1 px-5 md:px-7 py-5 md:py-6 ${
                i < 4 ? 'border-b border-surface-dim' : ''
              }`}
            >
              <span className="text-sm text-primary tabular-nums pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-base md:text-lg font-medium text-on-surface">
                {step.title}
              </h3>
              <p className="col-start-2 md:col-start-3 text-[15px] text-on-surface-variant leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
      {/* Variant 2: Editorial Minimalist */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim">
      <h2 className="font-headline-md text-headline-md text-primary mb-12 text-center">Вариант 2: Порядок и условия выкупа</h2>
      <div className="max-w-4xl mx-auto flex flex-col">
      <div className="py-8 border-t border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start">
      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">Выбор товара</h3>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&amp;M или Next.</p>
      </div>
      <div className="py-8 border-t border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start bg-surface-container-low/50 px-6 -mx-6 rounded-2xl">
      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">Оформление заказа</h3>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Присылаете нам ссылки на выбранные товары в Telegram или Instagram.</p>
      </div>
      <div className="py-8 border-t border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start">
      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">Расчет стоимости</h3>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.</p>
      </div>
      <div className="py-8 border-t border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start bg-surface-container-low/50 px-6 -mx-6 rounded-2xl">
      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">Оплата</h3>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Вы производите оплату удобным способом.</p>
      </div>
      <div className="py-8 border-t border-b border-[#ce7ed5]/20 flex flex-col md:flex-row gap-4 md:gap-12 items-start">
      <h3 className="font-headline-md text-xl text-primary md:w-1/3 shrink-0">Доставка</h3>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Мы выкупаем товар и доставляем его вам в кратчайшие сроки.</p>
      </div>
      </div>
      </section>
      {/* Variant 3: Visual Narrative */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20 border-t border-surface-dim overflow-hidden font-[EB_Garamond,Plus_Jakarta_Sans,sans-serif]">
      <h2 className="font-headline-md text-headline-md text-primary mb-16 text-center">Вариант 3: Порядок и условия выкупа</h2>
      <div className="relative">
      <div className="hidden md:block absolute top-10 left-0 w-full h-[1px] bg-outline-variant/30 z-0"></div>
      <div className="flex flex-col md:flex-row gap-8 overflow-x-auto hide-scroll relative z-10 pb-8 snap-x snap-mandatory px-4 md:px-0">
      <div className="flex-1 min-w-[200px] snap-start group">
      <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
      <span className="material-symbols-outlined text-3xl font-light">search</span>
      </div>
      <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">Выбор товара</h3>
      <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&amp;M или Next.</p>
      </div>
      <div className="flex-1 min-w-[200px] snap-start group">
      <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
      <span className="material-symbols-outlined text-3xl font-light">edit_document</span>
      </div>
      <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">Оформление заказа</h3>
      <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">Присылаете нам ссылки на выбранные товары в Telegram или Instagram.</p>
      </div>
      <div className="flex-1 min-w-[200px] snap-start group">
      <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
      <span className="material-symbols-outlined text-3xl font-light">calculate</span>
      </div>
      <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">Расчет стоимости</h3>
      <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.</p>
      </div>
      <div className="flex-1 min-w-[200px] snap-start group">
      <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
      <span className="material-symbols-outlined text-3xl font-light">payment</span>
      </div>
      <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">Оплата</h3>
      <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">Вы производите оплату удобным способом.</p>
      </div>
      <div className="flex-1 min-w-[200px] snap-start group">
      <div className="w-20 h-20 mx-auto bg-surface border border-outline-variant/30 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#ce7ed5]/10 group-hover:border-[#ce7ed5] transition-colors duration-300">
      <span className="material-symbols-outlined text-3xl font-light">local_shipping</span>
      </div>
      <h3 className="text-center font-body-lg text-lg text-primary mb-3 uppercase tracking-widest font-medium">Доставка</h3>
      <p className="text-center font-body-md text-on-surface-variant text-sm leading-relaxed">Мы выкупаем товар и доставляем его вам в кратчайшие сроки.</p>
      </div>
      </div>
      </div>
      </section>
      </main>
      {/* Footer */}
      <footer className="bg-surface-container-low dark:bg-surface-container-highest w-full px-margin-desktop py-16 flex flex-col items-center gap-6 max-w-[1200px] mx-auto border-t border-surface-dim mt-8">
      <h2 className="font-display-lg-mobile text-primary mb-2 font-bold tracking-tight">Belkson</h2>
      <nav className="flex flex-wrap justify-center gap-8 mb-6 font-body-md text-body-md">
      <a className="text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">О нас</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Таблица размеров</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Доставка и возврат</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Контакты</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Политика конфиденциальности</a>
      <Link className="text-on-surface-variant hover:text-primary transition-colors duration-200" to="/admin">Админ</Link>
      </nav>
      <div className="flex gap-6 mb-2"><a className="text-primary hover:text-[#ce7ed5] transition-colors flex items-center gap-2 font-medium" href={getInstagramProfileUrl()} target="_blank" rel="noopener noreferrer"><span className="material-symbols-outlined">photo_camera</span> Instagram</a><a className="text-primary hover:text-[#ce7ed5] transition-colors flex items-center gap-2 font-medium" href={getTelegramProfileUrl()} target="_blank" rel="noopener noreferrer"><span className="material-symbols-outlined">send</span> Telegram</a></div><p className="text-outline font-body-md text-body-md text-sm">
              © {new Date().getFullYear()} Belkson Kids. Все права защищены.
          </p>
      </footer>
      {/* Navigation Drawer Overlay */}
      <div aria-hidden={!navOpen} className={navOverlayClass} id="nav-overlay">
      {/* Backdrop */}
      <div className={navBackdropClass} id="nav-backdrop" onClick={toggleNavDrawer} />
      {/* Sliding Panel */}
      <div className={navPanelClass} id="nav-panel">
      <div className="px-6 py-5 border-b border-surface-dim flex justify-between items-center bg-surface-container-low">
      <h2 className="font-headline-md text-primary font-bold">Меню</h2>
      <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-error transition-colors" onClick={toggleNavDrawer}>
      <span className="material-symbols-outlined">close</span>
      </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
      <a className="text-on-surface font-body-lg font-medium text-xl hover:text-[#ce7ed5] transition-colors" href="#" onClick={toggleNavDrawer}>Главная</a><hr className="border-t border-[#EAE6EE] my-2" />
      <div className="flex flex-col gap-5">
      <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">Категории</h3>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#novinki" onClick={toggleNavDrawer}>Новинки</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#lyubimchiki" onClick={toggleNavDrawer}>Топ распродаж</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#prochee" onClick={toggleNavDrawer}>Прочее</a>
      <hr className="border-t border-[#EAE6EE] my-2" />
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="{{DATA:SCREEN:SCREEN_83}}" onClick={toggleNavDrawer}>Девочки</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="{{DATA:SCREEN:SCREEN_83}}" onClick={toggleNavDrawer}>Мальчики</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#" onClick={toggleNavDrawer}>Малыши</a>
      </div>
      <hr className="border-t border-[#EAE6EE] my-2" />
      <div className="flex flex-col gap-5">
      <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">Выкуп с официальных сайтов</h3>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#" onClick={toggleNavDrawer}>Zara</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#" onClick={toggleNavDrawer}>H&amp;M</a>
      <a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors" href="#" onClick={toggleNavDrawer}>Next</a>
      </div>
      <hr className="border-t border-[#EAE6EE] my-2" /><div className="flex flex-col gap-5"><h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">Соцсети</h3><a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors flex items-center gap-3" href={getInstagramProfileUrl()} target="_blank" rel="noopener noreferrer"><span className="material-symbols-outlined text-primary">photo_camera</span> Instagram</a><a className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors flex items-center gap-3" href={getTelegramProfileUrl()} target="_blank" rel="noopener noreferrer"><span className="material-symbols-outlined text-primary">send</span> Telegram</a></div></div>
      </div>
      </div>
      {/* Full Screen Shopping Bag Overlay */}
      <div aria-hidden={!cartOpen} className={cartOverlayClass} id="cart-overlay">
      {/* Backdrop */}
      <div className={cartBackdropClass} id="cart-backdrop" onClick={toggleCart} />
      {/* Sliding Panel */}
      <div className={cartPanelClass} id="cart-panel">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-dim flex justify-between items-center bg-surface-container-low">
      <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
      <span className="material-symbols-outlined">shopping_bag</span>
                      Ваша корзина
                  </h2>
      <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-error transition-colors" onClick={toggleCart}>
      <span className="material-symbols-outlined">close</span>
      </button>
      </div>
      {/* Cart Contents */}
      {cartItems.length === 0 ? (
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-primary/50 mb-4">
      <span className="material-symbols-outlined text-5xl">shopping_cart</span>
      </div>
      <h3 className="font-headline-md text-on-surface">Пока здесь пусто</h3>
      <p className="font-body-md text-on-surface-variant max-w-[250px]">Добавьте товары из нашего каталога, чтобы сделать заказ.</p>
      <button type="button" className="mt-4 px-8 py-3 bg-primary-container text-on-primary-container rounded-full font-label-sm hover:bg-primary hover:text-white transition-colors" onClick={toggleCart}>
                      Перейти в каталог
                  </button>
      </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {cartItems.map((line) => (
          <div
            key={line.productId}
            className="flex gap-3 p-3 rounded-2xl bg-surface-container-low border border-surface-dim"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-surface-variant">
              <img
                src={line.image}
                alt={line.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface text-sm sm:text-base line-clamp-2 leading-snug">
                    {line.name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {line.color}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-surface-variant"
                  onClick={() => removeFromCart(line.productId)}
                  aria-label="Удалить"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 border border-surface-dim rounded-full bg-surface">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-surface-variant"
                    onClick={() =>
                      setQuantity(line.productId, line.quantity - 1)
                    }
                    aria-label="Меньше"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-surface-variant"
                    onClick={() =>
                      setQuantity(line.productId, line.quantity + 1)
                    }
                    aria-label="Больше"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm sm:text-base font-bold text-primary tabular-nums">
                  {format(line.priceRub * line.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
      {/* Footer / Checkout */}
      <div className="p-6 border-t border-surface-dim bg-surface-container-lowest">
      <div className="flex justify-between items-center mb-6 font-headline-md text-on-surface">
      <span>Итого</span>
      <span className="font-bold">{format(totalRub)}</span>
      </div>
      <button
        type="button"
        disabled={cartItems.length === 0}
        className={`w-full bg-primary text-on-primary font-label-sm py-4 rounded-full shadow-md transition-colors ${
          cartItems.length === 0
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-on-primary-fixed-variant active:scale-[0.99]'
        }`}
        onClick={() => {
          if (cartItems.length === 0) return
          openTelegramOrder(cartItems, format(totalRub))
        }}
      >
                      Оформить заказ
                  </button>
      </div>
      </div>
      </div>
    </>
  )
}
