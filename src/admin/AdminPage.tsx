import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, CURRENCIES, NAV_ITEMS } from './data'
import type { CurrencyCode, Product, ProductStatus } from './data'
import { useCatalog } from '../store/CatalogContext'
import { defaultProductImage } from '../store/catalog'

type SlideMode = 'add' | 'edit'

type FormState = {
  name: string
  sku: string
  price: string
  category: string
  color: string
  status: ProductStatus
  isNew: boolean
  isFavorite: boolean
}

const emptyForm: FormState = {
  name: '',
  sku: '',
  price: '',
  category: CATEGORIES[0],
  color: '',
  status: 'В наличии',
  isNew: true,
  isFavorite: false,
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
  )
}

function EditIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

/**
 * Port of static-admin/admin.html — responsive products admin.
 */
export default function AdminPage() {
  const {
    products,
    currency,
    setCurrency,
    format,
    addProduct,
    updateProduct,
    deleteProduct,
    loading,
    error,
    refresh,
  } = useCatalog()

  const [saving, setSaving] = useState(false)

  const [navOpen, setNavOpen] = useState(false)
  const [slideOpen, setSlideOpen] = useState(false)
  const [slideMode, setSlideMode] = useState<SlideMode>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>('RUB')

  useEffect(() => {
    const tw = (window as unknown as { tailwind?: { config: unknown } }).tailwind
    const adminCfg = (window as unknown as { __BELKSON_ADMIN_TW__?: unknown })
      .__BELKSON_ADMIN_TW__
    const storeCfg = (window as unknown as { __BELKSON_STORE_TW__?: unknown })
      .__BELKSON_STORE_TW__

    document.body.className =
      'flex h-[100dvh] overflow-hidden bg-background admin-body'
    document.documentElement.classList.add('admin-theme')

    if (tw && adminCfg) {
      tw.config = adminCfg
    }

    return () => {
      document.body.className =
        'bg-background text-on-background font-body-md overflow-x-hidden'
      document.documentElement.classList.remove('admin-theme')
      if (tw && storeCfg) {
        tw.config = storeCfg
      }
    }
  }, [])

  useEffect(() => {
    const locked = slideOpen || currencyOpen || navOpen
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [slideOpen, currencyOpen, navOpen])

  // Close mobile nav on desktop resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const openAdd = () => {
    setSlideMode('add')
    setEditingId(null)
    setForm(emptyForm)
    setSlideOpen(true)
  }

  const openEdit = (product: Product) => {
    setSlideMode('edit')
    setEditingId(product.id)
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(product.priceRub),
      category: product.category,
      color: product.color || '',
      status: product.status,
      isNew: product.isNew,
      isFavorite: product.isFavorite,
    })
    setSlideOpen(true)
  }

  const closeSlide = () => {
    setSlideOpen(false)
    setEditingId(null)
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      const priceRub = Math.max(0, Number(form.price) || 0)
      const payload = {
        name: form.name.trim() || 'Без названия',
        sku: form.sku.trim() || `BLK-${Date.now().toString().slice(-6)}`,
        priceRub,
        category: form.category,
        color: form.color.trim() || '—',
        status: form.status,
        image: defaultProductImage(),
        isNew: form.isNew,
        isFavorite: form.isFavorite,
      }

      if (slideMode === 'edit' && editingId != null) {
        const existing = products.find((p) => p.id === editingId)
        await updateProduct(editingId, {
          ...payload,
          image: existing?.image || payload.image,
          badge: existing?.badge,
        })
      } else {
        await addProduct({
          ...payload,
          badge: form.isNew ? 'NEW' : undefined,
        })
      }
      closeSlide()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const openCurrency = () => {
    setDraftCurrency(currency)
    setCurrencyOpen(true)
  }

  const applyCurrency = async () => {
    try {
      await setCurrency(draftCurrency)
      setCurrencyOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка смены валюты')
    }
  }

  const closeNav = () => setNavOpen(false)

  const navLinkClass = (active: boolean) =>
    active
      ? 'flex items-center gap-3 px-4 py-2.5 rounded-md text-primary-container bg-surface transition-all border border-gray-200'
      : 'flex items-center gap-3 px-4 py-2.5 rounded-md text-on-surface hover:bg-surface-variant transition-all'

  const sidebar = (
    <>
      <div className="mb-8 lg:mb-10 flex items-center justify-between gap-3 px-4">
        <div>
          <Link to="/" className="text-xl lg:text-headline-md font-headline-md font-bold text-on-surface hover:text-primary-container">
            Belkson
          </Link>
          <p className="text-label-md font-label-md text-on-surface-variant">
            Панель администратора
          </p>
        </div>
        <button
          type="button"
          className="lg:hidden p-2 -mr-2 rounded-md text-on-surface-variant hover:bg-surface-variant"
          onClick={closeNav}
          aria-label="Закрыть меню"
        >
          <Icon name="close" />
        </button>
      </div>
      <ul className="flex flex-col gap-1.5 flex-grow">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <a
              className={navLinkClass(item.active)}
              href={item.href}
              onClick={closeNav}
            >
              <Icon name={item.icon} />
              <span className="text-button font-button">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-200 pt-4">
        <Link className={navLinkClass(false)} to="/" onClick={closeNav}>
          <Icon name="logout" />
          <span className="text-button font-button">Выйти</span>
        </Link>
      </div>
    </>
  )

  return (
    <div className="admin-shell flex h-[100dvh] overflow-hidden bg-background w-full font-[Inter,system-ui,sans-serif]">
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-gray-200 flex-col py-8 px-4 z-20 shrink-0">
        {sidebar}
      </nav>

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 lg:hidden transition-opacity ${
          navOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeNav}
        aria-hidden={!navOpen}
      />
      <nav
        className={`fixed left-0 top-0 h-full w-[min(100%,18rem)] bg-surface-container-lowest border-r border-gray-200 flex flex-col py-6 px-4 z-50 lg:hidden transition-transform duration-300 ease-in-out ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!navOpen}
      >
        {sidebar}
      </nav>

      {/* Main */}
      <main className="lg:ml-64 flex-1 flex flex-col h-full bg-surface min-w-0 w-full">
        <header className="flex justify-between items-center gap-3 sm:gap-6 w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 bg-surface-container-lowest border-b border-gray-200 z-10 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl lg:max-w-2xl">
            <button
              type="button"
              className="lg:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-md text-on-surface hover:bg-surface-variant"
              onClick={() => setNavOpen(true)}
              aria-label="Открыть меню"
            >
              <Icon name="menu" />
            </button>
            <div className="relative w-full min-w-0">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
              />
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder-on-surface-variant text-on-surface"
                placeholder="Поиск товаров, заказов..."
                type="search"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <span>
                Не удалось загрузить каталог из Neon: {error}. Проверьте{' '}
                <code className="text-xs">DATABASE_URL</code> в{' '}
                <code className="text-xs">.env</code> и что выполнены schema + seed.
              </span>
              <button
                type="button"
                className="underline"
                onClick={() => void refresh()}
              >
                Повторить
              </button>
            </div>
          )}
          {loading && (
            <p className="text-sm text-on-surface-variant">Загрузка из Neon…</p>
          )}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl lg:text-[32px] lg:leading-10 font-semibold tracking-tight text-on-surface mb-2">
                Управление товарами
              </h1>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl">
                Управление запасами, ценами и деталями коллекции Belkson.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center justify-center gap-2 bg-[#ce7ed5] text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-opacity border border-[#ce7ed5] w-full md:w-auto shrink-0"
              onClick={openAdd}
            >
              <Icon name="add" className="text-sm" />
              <span className="text-button font-button">Добавить товар</span>
            </button>
          </div>

          <section className="w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
              <h3 className="text-xl font-semibold text-on-surface">
                Недавние товары
              </h3>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative inline-block">
                  <select
                    className="appearance-none bg-surface border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-body-sm font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
                    value={currency}
                    onChange={(e) => {
                      void setCurrency(e.target.value as CurrencyCode).catch(
                        (err) =>
                          alert(
                            err instanceof Error
                              ? err.message
                              : 'Ошибка смены валюты',
                          ),
                      )
                    }}
                  >
                    <option value="RUB">RUB (₽)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <Icon
                    name="expand_more"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-on-surface-variant"
                  />
                </div>
                <button
                  type="button"
                  className="p-2 bg-surface border border-gray-200 rounded-md text-on-surface hover:bg-surface-variant transition-colors"
                  aria-label="Фильтр"
                >
                  <Icon name="filter_list" className="text-sm" />
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-surface border border-gray-200 rounded-md text-body-sm font-medium text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto text-center"
                  onClick={openCurrency}
                >
                  <span className="sm:hidden">Валюта сайта</span>
                  <span className="hidden sm:inline">
                    Изменить валюту для всего сайта
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="bg-surface-container-lowest border border-gray-200 rounded-md p-3 flex gap-3"
                >
                  <div className="w-14 h-14 shrink-0 rounded-sm bg-surface-variant overflow-hidden border border-gray-200">
                    <img
                      className="w-full h-full object-cover"
                      alt={product.name}
                      src={product.image}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface text-sm leading-snug truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          #{product.id} · {product.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-on-surface-variant hover:text-on-surface p-1.5 -mr-1 rounded-md hover:bg-surface-variant"
                        onClick={() => openEdit(product)}
                        aria-label={`Редактировать ${product.name}`}
                      >
                        <EditIcon />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-sm font-medium text-on-surface">
                        {format(product.priceRub)}
                      </span>
                      <span className="bg-surface-variant text-on-surface px-2 py-0.5 rounded-sm text-xs">
                        {product.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table — full width of content area */}
            <div className="hidden md:block w-full bg-surface-container-lowest border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse text-sm">
                <colgroup>
                  <col className="w-[56px]" />
                  <col className="w-[72px]" />
                  <col />
                  <col className="w-[140px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[88px]" />
                </colgroup>
                <thead>
                  <tr className="bg-surface border-b border-gray-200">
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      ID
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      Фото
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      Название
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      Категория
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      Цена
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant">
                      Статус
                    </th>
                    <th className="p-3 text-label-md font-label-md text-on-surface-variant text-right">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="text-body-sm font-body-sm text-on-surface">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-200 last:border-b-0 hover:bg-surface transition-colors"
                    >
                      <td className="p-3 text-on-surface-variant align-middle">
                        {product.id}
                      </td>
                      <td className="p-3 align-middle">
                        <div className="w-10 h-10 rounded-sm bg-surface-variant overflow-hidden border border-gray-200">
                          <img
                            className="w-full h-full object-cover"
                            alt={product.name}
                            src={product.image}
                          />
                        </div>
                      </td>
                      <td className="p-3 font-medium align-middle truncate">
                        {product.name}
                      </td>
                      <td className="p-3 align-middle">{product.category}</td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {format(product.priceRub)}
                      </td>
                      <td className="p-3 align-middle">
                        <span className="inline-block bg-surface-variant text-on-surface px-2 py-1 rounded-sm text-xs">
                          {product.status}
                        </span>
                      </td>
                      <td className="p-3 text-right align-middle">
                        <button
                          type="button"
                          className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
                          onClick={() => openEdit(product)}
                          aria-label={`Редактировать ${product.name}`}
                        >
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Product slide-over */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${
          slideOpen ? '' : 'hidden'
        }`}
        onClick={closeSlide}
        aria-hidden={!slideOpen}
      />
      <div
        id="admin-slide-over"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface-container-lowest z-[70] flex flex-col border-l border-gray-200 transition-transform duration-300 ease-in-out ${
          slideOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!slideOpen}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
          <h2 className="text-lg sm:text-headline-md font-headline-md text-on-surface">
            {slideMode === 'edit' ? 'Редактировать товар' : 'Добавить товар'}
          </h2>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-md hover:bg-surface-variant"
            onClick={closeSlide}
            aria-label="Закрыть"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
          <div className="w-full h-28 sm:h-32 rounded-md border border-dashed border-gray-300 bg-surface flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer">
            <Icon name="image" className="text-lg mb-1" />
            <span className="text-body-sm font-body-sm">Загрузить фото</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">
                Название
              </label>
              <input
                className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1">
                  Артикул
                </label>
                <input
                  className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                  type="text"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1">
                  Цена (₽)
                </label>
                <input
                  className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                  placeholder="0"
                  step="1"
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">
                Категория
              </label>
              <select
                className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">
                Цвет / оттенок
              </label>
              <input
                className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                type="text"
                value={form.color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1">
                Статус
              </label>
              <select
                className="w-full p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as ProductStatus,
                  }))
                }
              >
                <option value="В наличии">В наличии</option>
                <option value="Мало">Мало</option>
                <option value="Нет в наличии">Нет в наличии</option>
              </select>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-container focus:ring-primary-container"
                  checked={form.isNew}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isNew: e.target.checked }))
                  }
                />
                Показывать в «Новинки» на сайте
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-body-sm text-on-surface">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-container focus:ring-primary-container"
                  checked={form.isFavorite}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isFavorite: e.target.checked }))
                  }
                />
                Показывать в «Любимчики» на сайте
              </label>
            </div>
            {slideMode === 'edit' && editingId != null && (
              <button
                type="button"
                className="text-sm text-error hover:underline text-left"
                onClick={() => {
                  void (async () => {
                    try {
                      await deleteProduct(editingId)
                      closeSlide()
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Ошибка удаления')
                    }
                  })()
                }}
              >
                Удалить товар
              </button>
            )}
          </div>
        </div>
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-button font-button text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto"
            onClick={closeSlide}
          >
            Отмена
          </button>
          <button
            type="button"
            className="bg-[#ce7ed5] text-white px-4 py-2.5 sm:py-2 rounded-md hover:bg-opacity-90 transition-opacity border border-[#ce7ed5] text-button font-button w-full sm:w-auto"
            onClick={() => void saveProduct()}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Currency modal */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${
          currencyOpen ? '' : 'hidden'
        }`}
        onClick={() => setCurrencyOpen(false)}
        aria-hidden={!currencyOpen}
      />
      <div
        className={`fixed z-[70] inset-x-3 sm:inset-x-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto sm:w-full max-w-md bg-surface-container-lowest border border-gray-200 rounded-md shadow-lg flex-col max-h-[min(90dvh,36rem)] ${
          currencyOpen ? 'flex' : 'hidden'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
          <h2
            id="currency-modal-title"
            className="text-base sm:text-headline-md font-headline-md text-on-surface pr-2"
          >
            Изменение валюты сайта
          </h2>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-md hover:bg-surface-variant shrink-0"
            onClick={() => setCurrencyOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <p className="text-body-sm text-on-surface-variant">
            Выберите основную валюту. Это изменение применится ко всем ценам в
            админ-панели и на основном сайте.
          </p>
          <div className="space-y-3">
            {CURRENCIES.map((c) => (
              <label
                key={c.code}
                className="flex items-center gap-3 cursor-pointer group p-2 -mx-2 rounded-md hover:bg-surface"
              >
                <input
                  className="w-4 h-4 text-primary-container focus:ring-primary-container border-gray-300"
                  name="site-currency"
                  type="radio"
                  value={c.code}
                  checked={draftCurrency === c.code}
                  onChange={() => setDraftCurrency(c.code)}
                />
                <span className="text-body-md text-on-surface">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-button font-button text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto"
            onClick={() => setCurrencyOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="bg-[#ce7ed5] text-white px-4 py-2.5 sm:py-2 rounded-md hover:bg-opacity-90 transition-opacity border border-[#ce7ed5] text-button font-button w-full sm:w-auto"
            onClick={applyCurrency}
          >
            Применить изменения
          </button>
        </div>
      </div>
    </div>
  )
}
