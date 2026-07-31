import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, CURRENCIES, NAV_ITEMS } from './data'
import type { CurrencyCode, Product, ProductStatus } from './data'
import { useCatalog } from '../store/CatalogContext'
import { useOfficialStores, type OfficialStore } from '../store/OfficialStoresContext'
import {
  usePurchaseTerms,
  type PurchaseTermStep,
  type PurchaseVariant,
  DEFAULT_DYNAMIC_VARIANTS,
} from '../store/PurchaseTermsContext'
import { defaultProductImage } from '../store/catalog'
import { fileToCompressedDataUrl, isLikelyImageUrl } from '../lib/imageUpload'

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
  /** Final image value: https URL or data:image/... */
  image: string
  /** Draft URL field (may not be applied until blur / apply) */
  imageUrlDraft: string
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
  image: '',
  imageUrlDraft: '',
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

const ICON_CATEGORIES = [
  {
    category: 'Шопинг и покупки',
    icons: [
      { name: 'shopping_bag', label: 'Пакет' },
      { name: 'shopping_cart', label: 'Корзина' },
      { name: 'storefront', label: 'Магазин' },
      { name: 'store', label: 'Витрина' },
      { name: 'sell', label: 'Продажа' },
      { name: 'label', label: 'Ярлык' },
      { name: 'redeem', label: 'Подарок' },
    ],
  },
  {
    category: 'Поиск и выбор',
    icons: [
      { name: 'search', label: 'Поиск' },
      { name: 'pageview', label: 'Просмотр' },
      { name: 'find_in_page', label: 'Найти' },
      { name: 'saved_search', label: 'Сохраненный' },
      { name: 'manage_search', label: 'Поиск товара' },
    ],
  },
  {
    category: 'Заказ и документы',
    icons: [
      { name: 'edit_document', label: 'Оформление' },
      { name: 'description', label: 'Документ' },
      { name: 'assignment', label: 'Задание' },
      { name: 'checklist', label: 'Чеклист' },
      { name: 'contract', label: 'Договор' },
      { name: 'receipt_long', label: 'Чек' },
    ],
  },
  {
    category: 'Оплата и финансы',
    icons: [
      { name: 'calculate', label: 'Расчет' },
      { name: 'payment', label: 'Оплата' },
      { name: 'credit_card', label: 'Карта' },
      { name: 'currency_ruble', label: 'Рубль' },
      { name: 'account_balance_wallet', label: 'Кошелек' },
      { name: 'payments', label: 'Платежи' },
      { name: 'paid', label: 'Оплачено' },
    ],
  },
  {
    category: 'Доставка и логистика',
    icons: [
      { name: 'local_shipping', label: 'Доставка' },
      { name: 'package_2', label: 'Посылка' },
      { name: 'inventory', label: 'Склад' },
      { name: 'flight_takeoff', label: 'Авиа' },
      { name: 'cargo', label: 'Груз' },
      { name: 'rv_hookup', label: 'Транспорт' },
    ],
  },
  {
    category: 'Связь и сервис',
    icons: [
      { name: 'forum', label: 'Чат' },
      { name: 'chat', label: 'Сообщения' },
      { name: 'send', label: 'Отправить' },
      { name: 'support_agent', label: 'Поддержка' },
      { name: 'verified', label: 'Гарантия' },
      { name: 'workspace_premium', label: 'Премиум' },
      { name: 'bolt', label: 'Быстро' },
      { name: 'star', label: 'Звезда' },
      { name: 'shield', label: 'Защита' },
    ],
  },
]

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

  const {
    stores: officialStores,
    loading: storesLoading,
    addStore,
    updateStore,
    deleteStore,
  } = useOfficialStores()

  const { variants: storeVariants, updateVariants } = usePurchaseTerms()

  const [activeTab, setActiveTab] = useState<'products' | 'official-stores' | 'purchase-terms'>('products')

  // Dynamic variants state
  const [localVariants, setLocalVariants] = useState<PurchaseVariant[]>(DEFAULT_DYNAMIC_VARIANTS)
  const [selectedVariantId, setSelectedVariantId] = useState<string>('v1')
  const [termsSaving, setTermsSaving] = useState(false)
  const [termsSavedSuccess, setTermsSavedSuccess] = useState(false)
  const [deleteVariantModalOpen, setDeleteVariantModalOpen] = useState(false)

  // Icon Picker state
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [targetStepId, setTargetStepId] = useState<string | null>(null)
  const [iconSearchQuery, setIconSearchQuery] = useState('')

  const openIconPicker = (stepId: string) => {
    setTargetStepId(stepId)
    setIconSearchQuery('')
    setIconPickerOpen(true)
  }

  const selectIcon = (iconName: string) => {
    if (targetStepId) {
      handleUpdateStep(targetStepId, 'icon', iconName)
    }
    setIconPickerOpen(false)
  }

  useEffect(() => {
    if (storeVariants && storeVariants.length > 0) {
      setLocalVariants(storeVariants)
      if (!storeVariants.some((v) => v.id === selectedVariantId)) {
        setSelectedVariantId(storeVariants[0].id)
      }
    }
  }, [storeVariants])

  const activeVariant = localVariants.find((v) => v.id === selectedVariantId) || localVariants[0]

  const handleUpdateActiveVariant = (updated: Partial<PurchaseVariant>) => {
    if (!activeVariant) return
    setLocalVariants(
      localVariants.map((v) => (v.id === activeVariant.id ? { ...v, ...updated } : v)),
    )
  }

  const handleAddVariant = () => {
    const nextNum = localVariants.length + 1
    const newId = `var-${Date.now()}`
    const newVariant: PurchaseVariant = {
      id: newId,
      badge: `Вариант ${nextNum}`,
      title: 'Порядок и условия выкупа',
      isActive: true,
      steps: [
        { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальном сайте.' },
        { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары.' },
        { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость.' },
      ],
    }
    setLocalVariants([...localVariants, newVariant])
    setSelectedVariantId(newId)
  }

  const handleDeleteVariant = () => {
    if (localVariants.length <= 1) {
      alert('Нельзя удалить единственный вариант')
      return
    }
    const remaining = localVariants.filter((v) => v.id !== activeVariant.id)
    setLocalVariants(remaining)
    setSelectedVariantId(remaining[0].id)
    setDeleteVariantModalOpen(false)
  }

  const handleAddStep = () => {
    if (!activeVariant) return
    const newStep: PurchaseTermStep = {
      id: String(Date.now()),
      icon: 'star',
      title: 'Новый шаг',
      description: 'Описание этапа выкупа товара.',
    }
    handleUpdateActiveVariant({
      steps: [...activeVariant.steps, newStep],
    })
  }

  const handleUpdateStep = (id: string, field: keyof PurchaseTermStep, val: string) => {
    if (!activeVariant) return
    handleUpdateActiveVariant({
      steps: activeVariant.steps.map((step) =>
        step.id === id ? { ...step, [field]: val } : step,
      ),
    })
  }

  const handleRemoveStep = (id: string) => {
    if (!activeVariant) return
    handleUpdateActiveVariant({
      steps: activeVariant.steps.filter((step) => step.id !== id),
    })
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!activeVariant) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= activeVariant.steps.length) return
    const updated = [...activeVariant.steps]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    handleUpdateActiveVariant({
      steps: updated,
    })
  }

  const handleSavePurchaseTerms = async () => {
    setTermsSaving(true)
    try {
      await updateVariants(localVariants)
      setTermsSavedSuccess(true)
      setTimeout(() => setTermsSavedSuccess(false), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при сохранении')
    } finally {
      setTermsSaving(false)
    }
  }

  const [saving, setSaving] = useState(false)

  const [navOpen, setNavOpen] = useState(false)
  const [slideOpen, setSlideOpen] = useState(false)
  const [slideMode, setSlideMode] = useState<SlideMode>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>('RUB')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Store Drawer state
  const [storeDrawerOpen, setStoreDrawerOpen] = useState(false)
  const [storeDrawerMode, setStoreDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null)
  const [storeName, setStoreName] = useState('')
  const [storeCountries, setStoreCountries] = useState<{ name: string; url: string }[]>([])
  const [countryInput, setCountryInput] = useState('')
  const [countryUrlInput, setCountryUrlInput] = useState('')
  const [storeSaving, setStoreSaving] = useState(false)

  // Delete Store modal state
  const [deleteStoreModalOpen, setDeleteStoreModalOpen] = useState(false)
  const [deletingStoreId, setDeletingStoreId] = useState<number | null>(null)
  const [storeDeleting, setStoreDeleting] = useState(false)

  const openAddStore = () => {
    setStoreDrawerMode('add')
    setEditingStoreId(null)
    setStoreName('')
    setStoreCountries([])
    setCountryInput('')
    setCountryUrlInput('')
    setStoreDrawerOpen(true)
  }

  const openEditStore = (store: OfficialStore) => {
    setStoreDrawerMode('edit')
    setEditingStoreId(store.id)
    setStoreName(store.name)
    setStoreCountries(
      (store.countries || []).map((c) =>
        typeof c === 'string'
          ? { name: c, url: '' }
          : { name: c.name || '', url: c.url || '' },
      ),
    )
    setCountryInput('')
    setCountryUrlInput('')
    setStoreDrawerOpen(true)
  }

  const closeStoreDrawer = () => {
    setStoreDrawerOpen(false)
    setEditingStoreId(null)
  }

  const handleAddCountry = () => {
    const name = countryInput.trim()
    const url = countryUrlInput.trim()
    if (name && !storeCountries.some((c) => c.name === name)) {
      setStoreCountries([...storeCountries, { name, url }])
      setCountryInput('')
      setCountryUrlInput('')
    }
  }

  const handleRemoveCountry = (name: string) => {
    setStoreCountries(storeCountries.filter((c) => c.name !== name))
  }

  const handleSaveStore = async () => {
    if (!storeName.trim()) {
      alert('Введите название магазина')
      return
    }
    setStoreSaving(true)
    try {
      if (storeDrawerMode === 'add') {
        await addStore({
          name: storeName.trim(),
          countries: storeCountries,
          isActive: true,
        })
      } else if (editingStoreId != null) {
        await updateStore(editingStoreId, {
          name: storeName.trim(),
          countries: storeCountries,
        })
      }
      closeStoreDrawer()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения магазина')
    } finally {
      setStoreSaving(false)
    }
  }

  const confirmDeleteStore = async () => {
    if (deletingStoreId == null) return
    setStoreDeleting(true)
    try {
      await deleteStore(deletingStoreId)
      setDeleteStoreModalOpen(false)
      setDeletingStoreId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления магазина')
    } finally {
      setStoreDeleting(false)
    }
  }

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
    const locked =
      slideOpen ||
      currencyOpen ||
      navOpen ||
      deleteOpen ||
      storeDrawerOpen ||
      deleteStoreModalOpen
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [
    slideOpen,
    currencyOpen,
    navOpen,
    deleteOpen,
    storeDrawerOpen,
    deleteStoreModalOpen,
  ])

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
    setImageError(null)
    setImageBusy(false)
    setSlideOpen(true)
  }

  const openEdit = (product: Product) => {
    setSlideMode('edit')
    setEditingId(product.id)
    const img = product.image || ''
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(product.priceRub),
      category: product.category,
      color: product.color || '',
      status: product.status,
      isNew: product.isNew,
      isFavorite: product.isFavorite,
      image: img,
      imageUrlDraft: img.startsWith('data:') ? '' : img,
    })
    setImageError(null)
    setImageBusy(false)
    setSlideOpen(true)
  }

  const closeSlide = () => {
    setSlideOpen(false)
    setEditingId(null)
    setDeleteOpen(false)
    setImageError(null)
    setImageBusy(false)
  }

  const applyImageUrl = () => {
    const url = form.imageUrlDraft.trim()
    if (!url) {
      setImageError('Вставьте ссылку на изображение')
      return
    }
    if (!isLikelyImageUrl(url)) {
      setImageError('Нужна ссылка http(s)://… или data:image/…')
      return
    }
    setForm((f) => ({ ...f, image: url, imageUrlDraft: url }))
    setImageError(null)
  }

  const onPickFile = async (file: File | null) => {
    if (!file) return
    setImageBusy(true)
    setImageError(null)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setForm((f) => ({ ...f, image: dataUrl, imageUrlDraft: '' }))
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Ошибка загрузки файла')
    } finally {
      setImageBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearImage = () => {
    setForm((f) => ({ ...f, image: '', imageUrlDraft: '' }))
    setImageError(null)
  }

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) void onPickFile(file)
  }

  const confirmDelete = async () => {
    if (editingId == null) return
    setDeleting(true)
    try {
      await deleteProduct(editingId)
      setDeleteOpen(false)
      closeSlide()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  const saveProduct = async () => {
    setSaving(true)
    try {
      // Apply URL draft if user typed a link but didn't press «Применить»
      let image = form.image.trim()
      const draft = form.imageUrlDraft.trim()
      if (!image && draft && isLikelyImageUrl(draft)) {
        image = draft
      }
      if (!image) image = defaultProductImage()

      const priceRub = Math.max(0, Number(form.price) || 0)
      const payload = {
        name: form.name.trim() || 'Без названия',
        sku: form.sku.trim() || `BLK-${Date.now().toString().slice(-6)}`,
        priceRub,
        category:
          form.category.replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ') ||
          CATEGORIES[0],
        color: form.color.trim() || '—',
        status: form.status,
        image,
        isNew: form.isNew,
        isFavorite: form.isFavorite,
      }

      // Badge NEW only with isNew; empty string clears badge on update
      const badge = form.isNew ? 'NEW' : ''

      if (slideMode === 'edit' && editingId != null) {
        await updateProduct(editingId, {
          ...payload,
          badge,
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
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full text-left cursor-pointer ${navLinkClass(isActive)}`}
                onClick={() => {
                  setActiveTab(item.id as 'products' | 'official-stores' | 'purchase-terms')
                  closeNav()
                }}
              >
                <Icon name={item.icon} />
                <span className="text-button font-button">{item.label}</span>
              </button>
            </li>
          )
        })}
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
          {activeTab === 'purchase-terms' ? (
            <div className="space-y-6 max-w-4xl">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-gray-200 pb-5">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-[32px] lg:leading-10 font-semibold tracking-tight text-on-surface mb-2">
                    Условия выкупа
                  </h1>
                  <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                    Управление вариантами и шагами условий выкупа на сайте.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {termsSavedSuccess && (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                      <Icon name="check_circle" className="text-base" /> Сохранено!
                    </span>
                  )}
                  <button
                    type="button"
                    className="bg-[#ce7ed5] text-white px-5 py-2.5 rounded-lg hover:bg-opacity-90 transition-all font-medium text-sm shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    onClick={() => void handleSavePurchaseTerms()}
                    disabled={termsSaving}
                  >
                    <Icon name="save" />
                    <span>{termsSaving ? 'Сохранение…' : 'Сохранить'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Variant Selector Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {localVariants.map((v) => {
                    const isSel = activeVariant && v.id === activeVariant.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center gap-2 ${
                          isSel
                            ? 'bg-[#ce7ed5] text-white shadow-sm'
                            : 'bg-surface-container-lowest border border-gray-200 text-on-surface hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedVariantId(v.id)}
                      >
                        <span>{v.badge || v.title || 'Вариант'}</span>
                        {!v.isActive && (
                          <span className="text-[10px] opacity-75 uppercase"> (скрыт)</span>
                        )}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="px-3.5 py-2 border border-dashed border-[#ce7ed5] text-[#ce7ed5] hover:bg-[#ce7ed5]/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    onClick={handleAddVariant}
                  >
                    <Icon name="add" className="text-base" />
                    <span>Добавить вариант</span>
                  </button>
                </div>

                {localVariants.length > 1 && (
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer border border-red-200"
                    onClick={() => setDeleteVariantModalOpen(true)}
                  >
                    <Icon name="delete" className="text-sm" />
                    <span>Удалить этот вариант</span>
                  </button>
                )}
              </div>

              {/* Active Variant Settings Card */}
              {activeVariant && (
                <div className="bg-surface-container-lowest border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Название варианта (для админки)
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 bg-surface border border-gray-200 rounded-md text-sm text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
                            value={activeVariant.badge || ''}
                            onChange={(e) => handleUpdateActiveVariant({ badge: e.target.value })}
                            placeholder="Например: Вариант 1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Заголовок блока на сайте
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 bg-surface border border-gray-200 rounded-md text-sm text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
                            value={activeVariant.title}
                            onChange={(e) => handleUpdateActiveVariant({ title: e.target.value })}
                            placeholder="Например: Порядок и условия выкупа"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Стиль отображения на сайте
                          </label>
                          <select
                            className="w-full px-3 py-2 bg-surface border border-gray-200 rounded-md text-sm text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
                            value={
                              activeVariant.layout ||
                              (activeVariant.id === 'v1'
                                ? 'list'
                                : activeVariant.id === 'v2'
                                  ? 'editorial'
                                  : 'icons')
                            }
                            onChange={(e) =>
                              handleUpdateActiveVariant({ layout: e.target.value as any })
                            }
                          >
                            <option value="list">Нумерованный список</option>
                            <option value="editorial">Построчный минимализм</option>
                            <option value="icons">Круглые иконки</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:pt-4">
                      <span className="text-xs font-medium text-on-surface-variant">
                        Отображать на сайте:
                      </span>
                      <button
                        type="button"
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                          activeVariant.isActive ? 'bg-[#ce7ed5]' : 'bg-gray-300'
                        }`}
                        onClick={() =>
                          handleUpdateActiveVariant({ isActive: !activeVariant.isActive })
                        }
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            activeVariant.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Steps List Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                        <Icon name="format_list_numbered" className="text-[#ce7ed5]" />
                        <span>Шаги варианта ({activeVariant.steps.length})</span>
                      </h2>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 border border-[#ce7ed5] text-[#ce7ed5] hover:bg-[#ce7ed5]/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        onClick={handleAddStep}
                      >
                        <Icon name="add" className="text-sm" />
                        <span>Добавить шаг</span>
                      </button>
                    </div>

                    {activeVariant.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="bg-surface border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 relative"
                      >
                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#ce7ed5]/15 text-[#ce7ed5] font-bold text-xs flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h3 className="font-medium text-sm text-on-surface">
                              {step.stepLabel ? `${step.stepLabel}: ` : `Шаг ${index + 1}: `}{step.title || 'Без названия'}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-on-surface rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              onClick={() => handleMoveStep(index, 'up')}
                              disabled={index === 0}
                              title="Выше"
                            >
                              <Icon name="arrow_upward" className="text-sm" />
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-on-surface rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer"
                              onClick={() => handleMoveStep(index, 'down')}
                              disabled={index === activeVariant.steps.length - 1}
                              title="Ниже"
                            >
                              <Icon name="arrow_downward" className="text-sm" />
                            </button>
                            <button
                              type="button"
                              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer ml-1"
                              onClick={() => handleRemoveStep(step.id)}
                              title="Удалить шаг"
                            >
                              <Icon name="delete" className="text-sm" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-on-surface-variant mb-1">
                              Иконка
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="w-10 h-10 rounded-lg bg-surface-container-lowest border border-gray-300 hover:border-[#ce7ed5] hover:bg-[#ce7ed5]/10 flex items-center justify-center shrink-0 text-primary transition-all cursor-pointer group/icon shadow-xs"
                                onClick={() => openIconPicker(step.id)}
                                title="Нажмите для выбора иконки"
                              >
                                {step.icon && step.icon !== 'none' ? (
                                  <Icon name={step.icon} className="text-xl group-hover/icon:scale-110 transition-transform" />
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-bold">НЕТ</span>
                                )}
                              </button>
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  className="w-full pl-2.5 pr-20 py-2 bg-surface-container-lowest border border-gray-200 rounded-md text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                                  value={step.icon || ''}
                                  onChange={(e) => handleUpdateStep(step.id, 'icon', e.target.value)}
                                  placeholder="Без иконки..."
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  {step.icon && step.icon !== 'none' && (
                                    <button
                                      type="button"
                                      className="text-xs text-gray-400 hover:text-red-500 font-bold cursor-pointer px-1"
                                      onClick={() => handleUpdateStep(step.id, 'icon', '')}
                                      title="Убрать иконку"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="text-xs text-[#ce7ed5] hover:underline font-medium cursor-pointer"
                                    onClick={() => openIconPicker(step.id)}
                                  >
                                    Выбрать
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-on-surface-variant mb-1">
                                  Метка шага
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-gray-200 rounded-md text-xs text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
                                  value={step.stepLabel ?? `Шаг ${index + 1}`}
                                  onChange={(e) => handleUpdateStep(step.id, 'stepLabel', e.target.value)}
                                  placeholder="Шаг 1, Этап 1..."
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xs text-on-surface-variant mb-1">
                                  Название шага *
                                </label>
                                <input
                                  type="text"
                                  className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-gray-200 rounded-md text-xs text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
                                  value={step.title}
                                  onChange={(e) => handleUpdateStep(step.id, 'title', e.target.value)}
                                  placeholder="Например: Выбор товара"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-on-surface-variant mb-1">
                                Описание этапа
                              </label>
                              <textarea
                                rows={2}
                                className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-gray-200 rounded-md text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                                value={step.description}
                                onChange={(e) => handleUpdateStep(step.id, 'description', e.target.value)}
                                placeholder="Описание..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {activeVariant.steps.length === 0 && (
                      <div className="text-center py-8 bg-surface border border-dashed border-gray-300 rounded-xl">
                        <p className="text-on-surface-variant text-xs mb-2">Шаги не добавлены.</p>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-[#ce7ed5] text-white rounded-lg text-xs font-medium hover:bg-opacity-90 transition-opacity cursor-pointer"
                          onClick={handleAddStep}
                        >
                          + Добавить шаг
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'official-stores' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-[32px] lg:leading-10 font-semibold tracking-tight text-on-surface mb-2">
                    Выкуп с официальных сайтов
                  </h1>
                  <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl">
                    Управление магазинами и доступными странами/регионами в выпадающем меню навигации.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-[#ce7ed5] text-white px-4 py-2.5 rounded-md hover:bg-opacity-90 transition-opacity border border-[#ce7ed5] w-full md:w-auto shrink-0 cursor-pointer font-medium"
                  onClick={openAddStore}
                >
                  <Icon name="add" className="text-sm" />
                  <span>Добавить магазин</span>
                </button>
              </div>

              {storesLoading ? (
                <p className="text-sm text-on-surface-variant">Загрузка магазинов из Neon…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officialStores.map((store) => (
                    <div
                      key={store.id}
                      className="bg-surface-container-lowest border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-on-surface">{store.name}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                store.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {store.isActive ? 'Активен' : 'Отключен'}
                            </span>
                          </div>
                          {/* Active Toggle */}
                          <button
                            type="button"
                            title={store.isActive ? 'Деактивировать' : 'Активировать'}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                              store.isActive ? 'bg-[#ce7ed5]' : 'bg-gray-300'
                            }`}
                            onClick={() => {
                              void updateStore(store.id, { isActive: !store.isActive })
                            }}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                store.isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-2">
                            Страны / регионы выкупа ({store.countries.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {store.countries.map((c) => {
                              const name = typeof c === 'string' ? c : c.name
                              const url = typeof c === 'string' ? '' : c.url
                              return (
                                <span
                                  key={name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface border border-gray-200 text-on-surface"
                                >
                                  <span>{name}</span>
                                  {url && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={url}
                                      className="text-[#ce7ed5] hover:underline inline-flex items-center"
                                    >
                                      <Icon name="open_in_new" className="text-[12px]" />
                                    </a>
                                  )}
                                </span>
                              )
                            })}
                            {store.countries.length === 0 && (
                              <span className="text-xs text-gray-400 italic">
                                Нет добавленных стран
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-variant rounded-md transition-colors cursor-pointer"
                          onClick={() => openEditStore(store)}
                        >
                          <EditIcon />
                          <span>Изменить</span>
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          onClick={() => {
                            setDeletingStoreId(store.id)
                            setDeleteStoreModalOpen(true)
                          }}
                        >
                          <Icon name="delete" className="text-sm" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
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
          {/* Photo: URL / file / drag-drop */}
          <div className="space-y-3">
            <label className="block text-label-md font-label-md text-on-surface">
              Фото товара
            </label>

            <div
              className={`relative w-full rounded-md border border-dashed border-gray-300 bg-surface overflow-hidden transition-colors ${
                imageBusy ? 'opacity-70' : 'hover:bg-surface-variant/60'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={onDropFile}
            >
              {form.image ? (
                <div className="relative aspect-[4/3] w-full bg-surface-variant">
                  <img
                    src={form.image}
                    alt="Превью"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() =>
                      setImageError(
                        'Не удалось загрузить превью. Проверьте ссылку.',
                      )
                    }
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 flex flex-wrap gap-2 bg-gradient-to-t from-black/50 to-transparent">
                    <button
                      type="button"
                      className="text-xs font-medium bg-white/95 text-on-surface px-2.5 py-1.5 rounded-md"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageBusy}
                    >
                      Заменить с ПК
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium bg-white/95 text-red-700 px-2.5 py-1.5 rounded-md"
                      onClick={clearImage}
                      disabled={imageBusy}
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full h-32 sm:h-36 flex flex-col items-center justify-center text-on-surface-variant cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageBusy}
                >
                  <Icon name="image" className="text-2xl mb-1" />
                  <span className="text-body-sm font-body-sm">
                    {imageBusy
                      ? 'Обработка…'
                      : 'Перетащите фото или нажмите для выбора'}
                  </span>
                  <span className="text-xs text-on-surface-variant/80 mt-1">
                    JPG, PNG, WebP · до 8 МБ
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Или вставьте ссылку на фото
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 min-w-0 p-2.5 sm:p-2 bg-surface-container-lowest border border-gray-200 rounded-md text-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={form.imageUrlDraft}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrlDraft: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyImageUrl()
                    }
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-on-surface hover:bg-surface-variant transition-colors"
                  onClick={applyImageUrl}
                >
                  OK
                </button>
              </div>
            </div>

            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}
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
                {/* Legacy category still on the product but removed from list */}
                {form.category &&
                  !(CATEGORIES as readonly string[]).includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
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
                onClick={() => setDeleteOpen(true)}
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
        className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${
          currencyOpen ? '' : 'hidden'
        }`}
        aria-hidden={!currencyOpen}
      >
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setCurrencyOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-md max-h-[min(90dvh,36rem)] bg-surface-container-lowest border border-gray-200 rounded-md shadow-lg flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
            <h2
              id="currency-modal-title"
              className="text-base sm:text-xl font-semibold text-on-surface pr-2"
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
            <p className="text-sm text-on-surface-variant">
              Выберите основную валюту. Это изменение применится ко всем ценам
              в админ-панели и на основном сайте.
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
                  <span className="text-base text-on-surface">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-sm font-semibold text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto"
              onClick={() => setCurrencyOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="bg-[#ce7ed5] text-white px-4 py-2.5 sm:py-2 rounded-md hover:bg-opacity-90 transition-opacity border border-[#ce7ed5] text-sm font-semibold w-full sm:w-auto"
              onClick={() => void applyCurrency()}
            >
              Применить изменения
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal — centered via flex (no left-1/2 conflict) */}
      <div
        className={`fixed inset-0 z-[90] flex items-center justify-center p-4 ${
          deleteOpen ? '' : 'hidden'
        }`}
        aria-hidden={!deleteOpen}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => !deleting && setDeleteOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-md bg-surface-container-lowest border border-gray-200 rounded-md shadow-lg flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
            <h2
              id="delete-modal-title"
              className="text-base sm:text-xl font-semibold text-on-surface pr-2"
            >
              Удалить товар?
            </h2>
            <button
              type="button"
              className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-md hover:bg-surface-variant shrink-0"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              aria-label="Закрыть"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Товар будет удалён из каталога навсегда. Его больше не будет
              видно на сайте и в админ-панели.
            </p>
            {form.name.trim() && (
              <p className="text-base text-on-surface font-medium rounded-md bg-surface border border-gray-200 px-3 py-2">
                {form.name.trim()}
              </p>
            )}
            <p className="text-sm text-on-surface-variant">
              Это действие нельзя отменить.
            </p>
          </div>
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-sm font-semibold text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors w-full sm:w-auto disabled:opacity-60"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
      {/* Store slide-over drawer */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${
          storeDrawerOpen ? '' : 'hidden'
        }`}
        onClick={closeStoreDrawer}
        aria-hidden={!storeDrawerOpen}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface-container-lowest z-[70] flex flex-col border-l border-gray-200 transition-transform duration-300 ease-in-out ${
          storeDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!storeDrawerOpen}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
          <h2 className="text-lg sm:text-headline-md font-headline-md text-on-surface">
            {storeDrawerMode === 'edit' ? 'Редактировать магазин' : 'Добавить магазин'}
          </h2>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded cursor-pointer"
            onClick={closeStoreDrawer}
            aria-label="Закрыть"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-body-sm font-medium text-on-surface mb-2">
              Название магазина *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-surface border border-gray-200 rounded-md text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
              placeholder="Например: Zara, H&M, Massimo Dutti"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-on-surface mb-2">
              Страны / регионы выкупа и ссылки
            </label>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                className="w-full px-3 py-2 bg-surface border border-gray-200 rounded-md text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                placeholder="Название страны (например: Spain, UK, Турция)"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCountry()
                  }
                }}
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  className="flex-1 px-3 py-2 bg-surface border border-gray-200 rounded-md text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                  placeholder="Ссылка на сайт (например: https://zara.com/es/)"
                  value={countryUrlInput}
                  onChange={(e) => setCountryUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCountry()
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-[#ce7ed5] text-white rounded-md hover:bg-opacity-90 transition-opacity text-sm font-medium shrink-0 cursor-pointer"
                  onClick={handleAddCountry}
                >
                  + Добавить
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {storeCountries.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-surface border border-gray-200 text-on-surface font-medium"
                >
                  <span className="font-semibold">{c.name}</span>
                  {c.url ? (
                    <span className="text-xs text-on-surface-variant max-w-[150px] truncate" title={c.url}>
                      ({c.url})
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">(без ссылки)</span>
                  )}
                  <button
                    type="button"
                    className="hover:text-red-600 transition-colors cursor-pointer ml-1"
                    onClick={() => handleRemoveCountry(c.name)}
                  >
                    <Icon name="close" className="text-xs" />
                  </button>
                </span>
              ))}
              {storeCountries.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  Добавьте хотя бы одну страну/регион.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-surface flex justify-end gap-3 shrink-0">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
            onClick={closeStoreDrawer}
            disabled={storeSaving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="bg-[#ce7ed5] text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-opacity text-sm font-medium disabled:opacity-60 cursor-pointer"
            onClick={() => void handleSaveStore()}
            disabled={storeSaving}
          >
            {storeSaving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Delete Store Confirmation Modal */}
      <div
        className={`fixed inset-0 z-[90] flex items-center justify-center p-4 ${
          deleteStoreModalOpen ? '' : 'hidden'
        }`}
        aria-hidden={!deleteStoreModalOpen}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => !storeDeleting && setDeleteStoreModalOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-md bg-surface-container-lowest border border-gray-200 rounded-md shadow-lg flex flex-col"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-surface shrink-0">
            <h2 className="text-base sm:text-xl font-semibold text-on-surface pr-2">
              Удалить магазин?
            </h2>
            <button
              type="button"
              className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-md hover:bg-surface-variant shrink-0 cursor-pointer"
              onClick={() => setDeleteStoreModalOpen(false)}
              disabled={storeDeleting}
              aria-label="Закрыть"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Магазин будет удален из выпадающего меню выкупа навсегда.
            </p>
            <p className="text-sm text-on-surface-variant">
              Это действие нельзя отменить.
            </p>
          </div>
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-sm font-semibold text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto cursor-pointer"
              onClick={() => setDeleteStoreModalOpen(false)}
              disabled={storeDeleting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors w-full sm:w-auto disabled:opacity-60 cursor-pointer"
              onClick={() => void confirmDeleteStore()}
              disabled={storeDeleting}
            >
              {storeDeleting ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Variant Modal */}
      <div
        className={`fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 transition-opacity ${
          deleteVariantModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!deleteVariantModalOpen}
      >
        <div className="bg-surface-container-lowest border border-gray-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden font-[Inter,system-ui,sans-serif]">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-surface">
            <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <Icon name="delete" className="text-red-600" />
              <span>Удалить вариант?</span>
            </h3>
            <button
              type="button"
              className="text-on-surface-variant hover:text-on-surface transition-colors p-2 rounded-md hover:bg-surface-variant shrink-0 cursor-pointer"
              onClick={() => setDeleteVariantModalOpen(false)}
              aria-label="Закрыть"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Вы уверены, что хотите удалить «{activeVariant?.badge || activeVariant?.title}»?
            </p>
          </div>
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-surface flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md border border-gray-200 text-sm font-semibold text-on-surface hover:bg-surface-variant transition-colors w-full sm:w-auto cursor-pointer"
              onClick={() => setDeleteVariantModalOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="px-4 py-2.5 sm:py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors w-full sm:w-auto cursor-pointer"
              onClick={handleDeleteVariant}
            >
              Удалить вариант
            </button>
          </div>
        </div>
      </div>

      {/* Icon Picker Modal */}
      <div
        className={`fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity ${
          iconPickerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!iconPickerOpen}
        onClick={() => setIconPickerOpen(false)}
      >
        <div
          className="bg-surface-container-lowest border border-gray-200 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden font-[Inter,system-ui,sans-serif]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-surface shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <Icon name="grid_view" className="text-[#ce7ed5]" />
                <span>Выберите иконку</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Нажмите на любую иконку для применения к этапу
              </p>
            </div>
            <button
              type="button"
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setIconPickerOpen(false)}
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-gray-100 bg-surface-container-lowest shrink-0 space-y-3">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-surface border border-gray-200 rounded-lg text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#ce7ed5]"
                placeholder="Поиск иконки (поиск, доставка, оплата...)"
                value={iconSearchQuery}
                onChange={(e) => setIconSearchQuery(e.target.value)}
              />
              {iconSearchQuery && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  onClick={() => setIconSearchQuery('')}
                >
                  Очистить
                </button>
              )}
            </div>

            {/* Option to clear / no icon */}
            <button
              type="button"
              className={`w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-medium ${
                targetStepId &&
                (!activeVariant?.steps.find((s) => s.id === targetStepId)?.icon ||
                  activeVariant?.steps.find((s) => s.id === targetStepId)?.icon === 'none')
                  ? 'bg-gray-200 border-gray-400 text-gray-800 font-bold'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
              }`}
              onClick={() => selectIcon('')}
            >
              <Icon name="block" className="text-sm text-gray-500" />
              <span>Без иконки (не показывать круглую иконку)</span>
            </button>
          </div>

          {/* Icon Grid Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {ICON_CATEGORIES.map((cat) => {
              const filtered = cat.icons.filter(
                (ico) =>
                  ico.name.toLowerCase().includes(iconSearchQuery.toLowerCase()) ||
                  ico.label.toLowerCase().includes(iconSearchQuery.toLowerCase()),
              )
              if (filtered.length === 0) return null

              return (
                <div key={cat.category} className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    {cat.category}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {filtered.map((ico) => {
                      const isCurrent =
                        targetStepId &&
                        activeVariant?.steps.find((s) => s.id === targetStepId)?.icon === ico.name
                      return (
                        <button
                          key={ico.name}
                          type="button"
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group ${
                            isCurrent
                              ? 'bg-[#ce7ed5]/15 border-[#ce7ed5] text-[#ce7ed5] ring-2 ring-[#ce7ed5]/30 font-bold'
                              : 'bg-surface border-gray-200 hover:border-[#ce7ed5] hover:bg-[#ce7ed5]/5 text-on-surface'
                          }`}
                          onClick={() => selectIcon(ico.name)}
                          title={`${ico.label} (${ico.name})`}
                        >
                          <Icon name={ico.name} className="text-2xl mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] truncate max-w-full text-center leading-tight">
                            {ico.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Custom Icon Entry Footer */}
          <div className="p-4 border-t border-gray-200 bg-surface shrink-0 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
            <span>Нужна другая иконка? Введите любое имя Material Symbol в поле поиска или текстовое поле.</span>
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-on-surface rounded-lg font-medium transition-colors shrink-0 cursor-pointer"
              onClick={() => setIconPickerOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
