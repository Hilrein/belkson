import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCatalog } from '../store/CatalogContext'
import { useCart } from '../store/CartContext'
import { useOfficialStores } from '../store/OfficialStoresContext'
import { CATEGORIES } from '../store/catalog'
import {
  openTelegramOrder,
  openMaxOrder,
  getTelegramProfileUrl,
  type DeliveryMethod,
} from '../lib/telegramOrder'
import { getInstagramProfileUrl } from '../lib/instagram'
import { LoadingScreen } from './LoadingScreen'

const LOGO_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDRIGpaO5cyb72DuJFWmg7fxWR7x5H7FjUvJxjSPmGdAW8shR6cA3TIXynNwyAPvO5vV1K-Dwevw6XOSfPt-cMfFBA_bKImJDdmHNDekxBlxycmkG4ypq8lKktpdqH9KVy_aPMeS4PYPlbzeVFYIXqMy9wKri37ZUUZmdsSSAsP6dsweDFkmpKG6zV383BMuZn4iHw_31fDfw_t_7tEgUtcz0AXKxKaNuNl17EIb3e0jmXY9f7XZfKF0b6qwVyPoCZD7XkI9f7HOE2q'

const PROMO_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap'

/**
 * Shared storefront chrome: navbar, footer, nav drawer, cart.
 * All shop pages render as children via React Router <Outlet />.
 */
export default function StorefrontLayout() {
  const { format, loading } = useCatalog()
  const { stores: officialStores } = useOfficialStores()
  const activeOfficialStores = officialStores.filter((s) => s.isActive)
  const {
    items: cartItems,
    totalCount,
    subtotalRub,
    discountRub,
    totalRub,
    activeDiscount,
    nextDiscount,
    removeFromCart,
    setQuantity,
  } = useCart()
  const location = useLocation()
  const navigate = useNavigate()

  const [navOpen, setNavOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartStep, setCartStep] = useState<'items' | 'checkout'>('items')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('Ozon')
  const [addressNotes, setAddressNotes] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [resaleOpen, setResaleOpen] = useState(false)
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Direction-aware animation for the "Ещё X ₽ до скидки" amount
  const nextNeed = useMemo(
    () => (nextDiscount ? nextDiscount.thresholdRub - subtotalRub : 0),
    [nextDiscount, subtotalRub],
  )
  const [needDirection, setNeedDirection] = useState<'up' | 'down' | null>(null)
  const prevNeedRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const prev = prevNeedRef.current
    if (prev !== null && nextNeed !== prev) {
      setNeedDirection(nextNeed > prev ? 'up' : 'down')
    }
    prevNeedRef.current = nextNeed
  }, [nextNeed])

  useEffect(() => {
    if (loading) {
      setSplashVisible(true)
      setSplashFading(false)
      return
    }
    setSplashFading(true)
    const t = window.setTimeout(() => setSplashVisible(false), 450)
    return () => window.clearTimeout(t)
  }, [loading])

  // Close drawers on route change
  useEffect(() => {
    setNavOpen(false)
    setCartOpen(false)
    setSearchOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const locked = navOpen || cartOpen
    // Lock vertical scroll only — keep overflow-x clip from CSS so page can't drag sideways
    document.body.style.overflowY = locked ? 'hidden' : ''
    document.documentElement.style.overflowY = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflowY = ''
      document.documentElement.style.overflowY = ''
    }
  }, [navOpen, cartOpen])

  const toggleNavDrawer = useCallback(() => setNavOpen((v) => !v), [])
  const goToTerms = useCallback(() => {
    if (location.pathname === '/') {
      setNavOpen(false)
      window.setTimeout(() => {
        document.getElementById('usloviya-vykupa')?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
    } else {
      navigate('/#usloviya-vykupa')
    }
  }, [location.pathname, navigate])
  const handleResaleToggle = useCallback(() => {
    setResaleOpen((v) => !v)
  }, [])
  const toggleCart = useCallback(() => {
    setCartOpen((v) => {
      if (v) setCartStep('items')
      return !v
    })
  }, [])

  useEffect(() => {
    if (cartItems.length === 0) {
      setCartStep('items')
    }
  }, [cartItems.length])
  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) {
        setSearchQuery('')
        searchRef.current?.blur()
      }
      return !open
    })
  }, [])

  const submitSearch = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      const q = searchQuery.trim()
      if (q) {
        navigate(`/catalog?q=${encodeURIComponent(q)}`)
      } else {
        navigate('/catalog')
      }
      setSearchOpen(false)
    },
    [navigate, searchQuery],
  )

  const isHome = location.pathname === '/'
  const isCatalog = location.pathname.startsWith('/catalog')

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
    'absolute right-12 transition-all duration-300 ease-out bg-surface-container-low border border-outline-variant rounded-full py-2 px-4 focus:ring-2 focus:ring-primary-container focus:border-primary-container text-on-surface outline-none origin-right z-0 max-w-[min(12rem,calc(100vw-8rem))] ' +
    (searchOpen ? 'w-40 sm:w-48 md:w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none')

  // Shared nav item metrics so text baselines stay aligned (no py/pb jump on active)
  const navItem =
    'inline-flex items-center gap-0.5 h-14 text-[15px] font-normal leading-none border-b-2 border-transparent transition-colors box-border'
  const linkIdle =
    navItem + ' text-on-surface-variant hover:text-primary'
  const linkActive = navItem + ' text-primary border-primary'

  return (
    <>
      {splashVisible && <LoadingScreen fading={splashFading} />}

      {/* ── Shared navbar (from home) ─────────────────────────────── */}
      <header className="site-header bg-surface shadow-sm">
        <div className="flex justify-between items-center w-full min-w-0 px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto h-14 box-border">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150"
              onClick={toggleNavDrawer}
              aria-label="Меню"
            >
              <span className="material-symbols-outlined text-primary">menu</span>
            </button>
            <Link className="flex items-center gap-2 group" to="/">
              <img
                alt="Belkson Logo"
                className="shrink-0 object-contain w-8 h-8 group-hover:opacity-80 transition-opacity"
                src={LOGO_SRC}
              />
              <span className="font-display-lg-mobile text-primary font-bold text-xl tracking-tight hidden sm:block">
                Belkson
              </span>
            </Link>
          </div>

          <nav className="hidden lg:flex items-stretch gap-6 h-14">
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? linkActive : linkIdle)}
            >
              Главная
            </NavLink>

            {/* Categories mega menu */}
            <div className="relative group flex items-stretch">
              <button
                type="button"
                className={isCatalog ? linkActive : linkIdle}
              >
                Категории
                <span className="material-symbols-outlined text-[18px] leading-none translate-y-px">
                  keyboard_arrow_down
                </span>
              </button>
              <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-200">
                <div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 flex gap-8">
                  <div className="flex-1 flex flex-col justify-center gap-4 py-2 min-w-0">
                    <Link
                      className="text-primary hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to="/catalog"
                    >
                      Каталог
                    </Link>
                    <hr className="my-2 border-[#ce7ed5]/30" />
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to={isHome ? '#novinki' : '/#novinki'}
                    >
                      Новинки
                    </Link>
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to={isHome ? '#lyubimchiki' : '/#lyubimchiki'}
                    >
                      Топ распродаж
                    </Link>
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to={isHome ? '#prochee' : '/#prochee'}
                    >
                      Прочее
                    </Link>
                    <hr className="my-2 border-[#ce7ed5]/30" />
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to="/catalog?category=Девочки"
                    >
                      Девочки
                    </Link>
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to="/catalog?category=Мальчики"
                    >
                      Мальчики
                    </Link>
                    <Link
                      className="text-on-surface-variant hover:text-[#ce7ed5] text-lg transition-colors block font-body-lg font-medium"
                      to="/catalog?category=Малыши"
                    >
                      Малыши
                    </Link>
                  </div>
                  <div className="w-[240px] xl:w-[280px] relative rounded-3xl overflow-hidden group/promo shrink-0 bg-surface-container-low aspect-[4/5]">
                    <img
                      alt="Promo"
                      className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-700 opacity-90"
                      src={PROMO_SRC}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent flex flex-col justify-end p-6">
                      <h4 className="text-primary font-headline-md text-xl mb-1">
                        Весенняя коллекция
                      </h4>
                      <Link
                        className="text-on-surface-variant text-sm font-medium flex items-center gap-1 hover:text-[#ce7ed5] transition-colors"
                        to="/catalog"
                      >
                        Смотреть{' '}
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resale mega menu */}
            <div className="relative group flex items-stretch">
              <button type="button" className={linkIdle}>
                Выкуп с официальных сайтов
                <span className="material-symbols-outlined text-[18px] leading-none translate-y-px">
                  keyboard_arrow_down
                </span>
              </button>
              <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-200">
                <div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 xl:p-10 flex gap-6 xl:gap-8 overflow-x-auto">
                  {activeOfficialStores.map((store) => (
                    <div key={store.id} className="flex-1 min-w-[140px]">
                      <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">
                        {store.name}
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {store.countries.map((c) => {
                          const item = typeof c === 'object' && c !== null ? (c as { name?: string; url?: string }) : null
                          const name = item ? String(item.name || '') : String(c || '')
                          const url = item ? String(item.url || '#') : '#'
                          const isExternal = url.startsWith('http://') || url.startsWith('https://')
                          return (
                            <li key={name}>
                              {isExternal ? (
                                <a
                                  className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal text-sm"
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {name}
                                </a>
                              ) : (
                                <Link
                                  className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal text-sm"
                                  to={url !== '#' ? url : `/shop/${store.name.toLowerCase()}/${name.toLowerCase()}`}
                                >
                                  {name}
                                </Link>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-2 text-primary dark:text-primary-fixed-dim">
            <form
              className="relative flex items-center justify-end"
              onSubmit={submitSearch}
            >
              <input
                ref={searchRef}
                className={searchInputClass}
                id="header-search-input"
                placeholder="Поиск..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150 relative z-10 bg-surface"
                onClick={() => {
                  if (searchOpen && searchQuery.trim()) {
                    submitSearch()
                  } else {
                    toggleSearch()
                  }
                }}
                aria-label="Поиск"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </form>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors active:scale-95 duration-150 relative"
              onClick={toggleCart}
              aria-label="Корзина"
            >
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

      {/* Page content */}
      <Outlet />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-surface-container-low dark:bg-surface-container-highest w-full px-margin-mobile md:px-margin-desktop py-16 flex flex-col items-center gap-6 max-w-[1200px] mx-auto border-t border-surface-dim mt-8 box-border">
        <h2 className="font-display-lg-mobile text-primary mb-2 font-bold tracking-tight">
          Belkson
        </h2>
        <nav className="flex flex-wrap justify-center gap-8 mb-6 font-body-md text-body-md">
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            to="/catalog"
          >
            Каталог
          </Link>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            href="#"
          >
            О нас
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            href="#"
          >
            Таблица размеров
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            href="#"
          >
            Доставка и возврат
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            href="#"
          >
            Контакты
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            href="#"
          >
            Политика конфиденциальности
          </a>
          <Link
            className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            to="/admin"
          >
            Админ
          </Link>
        </nav>
        <div className="flex gap-6 mb-2">
          <a
            className="text-primary hover:text-[#ce7ed5] transition-colors flex items-center gap-2 font-medium"
            href={getInstagramProfileUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined">photo_camera</span>{' '}
            Instagram
          </a>
          <a
            className="text-primary hover:text-[#ce7ed5] transition-colors flex items-center gap-2 font-medium"
            href={getTelegramProfileUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined">send</span> Telegram
          </a>
        </div>
        <p className="text-outline font-body-md text-body-md text-sm">
          © {new Date().getFullYear()} Belkson Kids. Все права защищены.
        </p>
      </footer>

      {/* ── Mobile nav drawer ────────────────────────────────────── */}
      <div aria-hidden={!navOpen} className={navOverlayClass} id="nav-overlay">
        <div
          className={navBackdropClass}
          id="nav-backdrop"
          onClick={toggleNavDrawer}
        />
        <div className={navPanelClass} id="nav-panel">
          <div className="px-6 py-5 border-b border-surface-dim flex justify-between items-center bg-surface-container-low">
            <h2 className="font-headline-md text-primary font-bold">Меню</h2>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-error transition-colors"
              onClick={toggleNavDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            <Link
              className="text-on-surface font-body-lg font-medium text-xl hover:text-[#ce7ed5] transition-colors"
              to="/"
              onClick={toggleNavDrawer}
            >
              Главная
            </Link>
            <hr className="border-t border-[#EAE6EE] my-2" />
            <div className="flex flex-col gap-5">
              <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">
                Категории
              </h3>
              <Link
                className="text-primary font-body-lg text-lg font-medium hover:text-[#ce7ed5] transition-colors"
                to="/catalog"
                onClick={toggleNavDrawer}
              >
                Каталог
              </Link>
              <Link
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                to="/#novinki"
                onClick={toggleNavDrawer}
              >
                Новинки
              </Link>
              <Link
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                to="/#lyubimchiki"
                onClick={toggleNavDrawer}
              >
                Топ распродаж
              </Link>
              <Link
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                to="/#prochee"
                onClick={toggleNavDrawer}
              >
                Прочее
              </Link>
              <hr className="border-t border-[#EAE6EE] my-2" />
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                  to={`/catalog?category=${cat}`}
                  onClick={toggleNavDrawer}
                >
                  {cat}
                </Link>
              ))}
            </div>
            <hr className="border-t border-[#EAE6EE] my-2" />
            <div className="flex flex-col">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 text-left font-headline-md text-sm uppercase tracking-wider text-outline mb-1 hover:text-primary transition-colors"
                onClick={handleResaleToggle}
                aria-expanded={resaleOpen}
              >
                Выкуп с официальных сайтов
                <span
                  className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${
                    resaleOpen ? '' : '-rotate-90'
                  }`}
                >
                  expand_more
                </span>
              </button>
              <div
                className={`flex flex-col gap-5 overflow-hidden transition-all duration-300 ease-in-out ${
                  resaleOpen ? 'max-h-96 mt-5' : 'max-h-0'
                }`}
              >
                <button
                  type="button"
                  className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors text-left"
                  onClick={goToTerms}
                >
                  Порядок и условия выкупа
                </button>
                {activeOfficialStores.map((store) => {
                  const first = store.countries[0] as unknown
                  const firstUrl = first && typeof first === 'object' ? String((first as { url?: string }).url || '') : ''
                  const isExternal = firstUrl.startsWith('http://') || firstUrl.startsWith('https://')
                  return isExternal ? (
                    <a
                      key={store.id}
                      className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                      href={firstUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={toggleNavDrawer}
                    >
                      {store.name}
                    </a>
                  ) : (
                    <Link
                      key={store.id}
                      className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                      to={firstUrl || `/shop/${store.name.toLowerCase()}`}
                      onClick={toggleNavDrawer}
                    >
                      {store.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <hr className="border-t border-[#EAE6EE] my-2" />
            <div className="flex flex-col gap-5">
              <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">
                Соцсети
              </h3>
              <a
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors flex items-center gap-3"
                href={getInstagramProfileUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-primary">
                  photo_camera
                </span>{' '}
                Instagram
              </a>
              <a
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors flex items-center gap-3"
                href={getTelegramProfileUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-primary">
                  send
                </span>{' '}
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cart drawer ──────────────────────────────────────────── */}
      <div aria-hidden={!cartOpen} className={cartOverlayClass} id="cart-overlay">
        <div
          className={cartBackdropClass}
          id="cart-backdrop"
          onClick={toggleCart}
        />
        <div className={cartPanelClass} id="cart-panel">
          <div className="px-5 py-4 border-b border-[#eae6ee] flex justify-between items-center bg-white sticky top-0 z-10">
            {cartStep === 'checkout' ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
                  onClick={() => setCartStep('items')}
                  aria-label="Назад к корзине"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h2 className="font-semibold text-slate-900 text-base">
                  Оформление заказа
                </h2>
              </div>
            ) : (
              <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#8a4193]">shopping_bag</span>
                Корзина
              </h2>
            )}
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              onClick={toggleCart}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-1">
                <span className="material-symbols-outlined text-3xl">
                  shopping_cart
                </span>
              </div>
              <h3 className="font-medium text-slate-900 text-base">
                Ваша корзина пуста
              </h3>
              <p className="text-slate-500 text-xs max-w-[240px]">
                Выберите понравившиеся вещи в каталоге, чтобы сделать заказ.
              </p>
              <Link
                to="/catalog"
                className="mt-3 px-6 py-2.5 bg-[#8a4193] text-white rounded-full text-xs font-medium hover:bg-[#783681] transition-colors"
                onClick={toggleCart}
              >
                Перейти в каталог
              </Link>
            </div>
          ) : cartStep === 'checkout' ? (
            <div key="step-checkout" className="flex-1 overflow-y-auto p-5 space-y-5 animate-step-next">
              {/* Order summary banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Товаров: <span className="font-medium text-slate-900">{cartItems.length} шт.</span></p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">К оплате: {format(totalRub)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartStep('items')}
                  className="text-xs font-medium text-[#8a4193] hover:underline"
                >
                  Изменить
                </button>
              </div>

              {/* Delivery selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                  Доставка
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Ozon', name: 'Ozon', badge: 'ПВЗ' },
                    { id: 'Яндекс Маркет', name: 'Яндекс', badge: 'ПВЗ' },
                    { id: '5post', name: '5post', badge: 'Пятёрочка' },
                  ].map((option) => {
                    const isSelected = deliveryMethod === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDeliveryMethod(option.id as DeliveryMethod)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-[#8a4193] bg-[#8a4193]/5 text-[#8a4193] font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-medium text-sm">{option.name}</span>
                        <span className="text-[11px] text-slate-400 font-normal">{option.badge}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Address / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                  Адрес ПВЗ или комментарий <span className="font-normal text-slate-400 lowercase">(опционально)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="г. Москва, ул. Ленина 10 или номер ПВЗ"
                  value={addressNotes}
                  onChange={(e) => setAddressNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#8a4193] transition-colors resize-none"
                />
              </div>

              {/* Messenger choices */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5">
                  Отправить заказ
                </label>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const discountLabel =
                        activeDiscount && discountRub > 0
                          ? activeDiscount.type === 'percent'
                            ? `−${activeDiscount.value}% (${format(discountRub)})`
                            : `−${format(discountRub)}`
                          : undefined
                      openTelegramOrder(
                        cartItems,
                        format(totalRub),
                        discountLabel,
                        deliveryMethod,
                        addressNotes,
                      )
                    }}
                    className="w-full py-3 px-4 rounded-full bg-[#24A1DE] hover:bg-[#1f8ec4] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.89 8.01-3.46 3.81-1.6 4.6-1.88 5.12-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.29z"/>
                    </svg>
                    Оформить через Telegram
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const discountLabel =
                        activeDiscount && discountRub > 0
                          ? activeDiscount.type === 'percent'
                            ? `−${activeDiscount.value}% (${format(discountRub)})`
                            : `−${format(discountRub)}`
                          : undefined
                      openMaxOrder(
                        cartItems,
                        format(totalRub),
                        discountLabel,
                        deliveryMethod,
                        addressNotes,
                      )
                    }}
                    className="w-full py-3 px-4 rounded-full bg-[#8a4193] hover:bg-[#783681] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">forum</span>
                    Оформить через Max
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key="step-items" className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 animate-step-back">
              {cartItems.map((line) => (
                <div
                  key={line.productId}
                  className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
                >
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={line.image}
                      alt={line.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-xs sm:text-sm line-clamp-1">
                          {line.name}
                        </p>
                        {line.sizes && line.sizes.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {line.sizes.join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1"
                        onClick={() => removeFromCart(line.productId)}
                        aria-label="Удалить"
                      >
                        <span className="material-symbols-outlined text-base">
                          delete
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-full bg-white">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors text-xs"
                          onClick={() =>
                            setQuantity(line.productId, line.quantity - 1)
                          }
                          aria-label="Меньше"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-semibold tabular-nums text-slate-900">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors text-xs"
                          onClick={() =>
                            setQuantity(line.productId, line.quantity + 1)
                          }
                          aria-label="Больше"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                        {format(line.priceRub * line.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {cartStep === 'items' && (
            <div className="p-5 border-t border-slate-200 bg-white">
              {nextDiscount && (
                <div className="mb-3">
                  <p className="mb-1.5 text-[11px] text-slate-500">
                    Ещё{' '}
                    <span
                      key={`${nextNeed}-${needDirection}`}
                      className={`inline-block font-semibold text-slate-900 ${
                        needDirection === 'up'
                          ? 'animate-need-up'
                          : needDirection === 'down'
                            ? 'animate-need-down'
                            : ''
                      }`}
                    >
                      {format(nextNeed)}
                    </span>{' '}
                    до скидки{' '}
                    <span className="font-semibold text-[#8a4193]">
                      {nextDiscount.type === 'percent'
                        ? `${nextDiscount.value}%`
                        : format(nextDiscount.value)}
                    </span>
                  </p>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#8a4193] transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (subtotalRub / nextDiscount.thresholdRub) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                <span>Сумма</span>
                <span className="text-slate-900 font-medium">{format(subtotalRub)}</span>
              </div>
              {activeDiscount && discountRub > 0 && (
                <div className="flex justify-between items-center mb-1 text-xs text-emerald-600">
                  <span>
                    Скидка{' '}
                    {activeDiscount.type === 'percent'
                      ? `${activeDiscount.value}%`
                      : ''}
                  </span>
                  <span className="font-semibold">−{format(discountRub)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-4 text-sm font-bold text-slate-900">
                <span>Итого</span>
                <span className="text-base text-[#8a4193]">
                  {format(totalRub)}
                </span>
              </div>
              <button
                type="button"
                disabled={cartItems.length === 0}
                className={`w-full bg-[#8a4193] text-white text-xs font-semibold py-3 rounded-full shadow-xs transition-colors ${
                  cartItems.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#783681] active:scale-[0.99]'
                }`}
                onClick={() => {
                  if (cartItems.length === 0) return
                  setCartStep('checkout')
                }}
              >
                Оформить заказ
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
