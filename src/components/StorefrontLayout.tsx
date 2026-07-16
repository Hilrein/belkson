import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCatalog } from '../store/CatalogContext'
import { useCart } from '../store/CartContext'
import { CATEGORIES } from '../store/catalog'
import { openTelegramOrder, getTelegramProfileUrl } from '../lib/telegramOrder'
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
  const {
    items: cartItems,
    totalCount,
    totalRub,
    removeFromCart,
    setQuantity,
  } = useCart()
  const location = useLocation()
  const navigate = useNavigate()

  const [navOpen, setNavOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

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
  const toggleCart = useCallback(() => setCartOpen((v) => !v), [])
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
                <div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 xl:p-10 flex gap-6 xl:gap-8">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">
                      Zara
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {['Spain', 'UK', 'Poland', 'Germany', 'Kazakhstan'].map(
                        (c) => (
                          <li key={c}>
                            <a
                              className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal"
                              href="#"
                            >
                              {c}
                            </a>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">
                      H&amp;M
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {['UK', 'Germany', 'Poland', 'USA'].map((c) => (
                        <li key={c}>
                          <a
                            className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal"
                            href="#"
                          >
                            {c}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">
                      Next
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {['UK', 'Kazakhstan', 'Germany', 'Spain'].map((c) => (
                        <li key={c}>
                          <a
                            className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal"
                            href="#"
                          >
                            {c}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
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
            <div className="flex flex-col gap-5">
              <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">
                Выкуп с официальных сайтов
              </h3>
              <a
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                href="#"
                onClick={toggleNavDrawer}
              >
                Zara
              </a>
              <a
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                href="#"
                onClick={toggleNavDrawer}
              >
                H&amp;M
              </a>
              <a
                className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
                href="#"
                onClick={toggleNavDrawer}
              >
                Next
              </a>
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
          <div className="px-6 py-5 border-b border-surface-dim flex justify-between items-center bg-surface-container-low">
            <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">shopping_bag</span>
              Ваша корзина
            </h2>
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-error transition-colors"
              onClick={toggleCart}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {cartItems.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-primary/50 mb-4">
                <span className="material-symbols-outlined text-5xl">
                  shopping_cart
                </span>
              </div>
              <h3 className="font-headline-md text-on-surface">
                Пока здесь пусто
              </h3>
              <p className="font-body-md text-on-surface-variant max-w-[250px]">
                Добавьте товары из нашего каталога, чтобы сделать заказ.
              </p>
              <Link
                to="/catalog"
                className="mt-4 px-8 py-3 bg-primary-container text-on-primary-container rounded-full font-label-sm hover:bg-primary hover:text-white transition-colors"
                onClick={toggleCart}
              >
                Перейти в каталог
              </Link>
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
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
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
