import type { Product, ProductCategory, RegionId, StoreId } from '../types/shop'

export interface RegionMetadata {
  id: RegionId
  name: string
  flag: string
  currency: string
  symbol: string
  exchangeRate: number
}

export const REGIONS: Record<RegionId, RegionMetadata> = {
  spain: { id: 'spain', name: 'Испания', flag: '🇪🇸', currency: 'EUR', symbol: '€', exchangeRate: 98 },
  uk: { id: 'uk', name: 'Великобритания', flag: '🇬🇧', currency: 'GBP', symbol: '£', exchangeRate: 115 },
  poland: { id: 'poland', name: 'Польша', flag: '🇵🇱', currency: 'PLN', symbol: 'zł', exchangeRate: 22 },
  germany: { id: 'germany', name: 'Германия', flag: '🇩🇪', currency: 'EUR', symbol: '€', exchangeRate: 98 },
  kazakhstan: { id: 'kazakhstan', name: 'Казахстан', flag: '🇰🇿', currency: 'KZT', symbol: '₸', exchangeRate: 0.20 },
}

export const STORES: Record<StoreId, { name: string }> = {
  belkson: { name: 'Belkson' },
  zara: { name: 'Zara Kids' },
  hm: { name: 'H&M' },
  next: { name: 'Next' },
}

// Curated high quality Zara Kids photos
const KIDS_CATEGORY_IMAGES: Record<ProductCategory, string[][]> = {
  all: [],
  girl: [
    [
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80',
    ],
  ],
  boy: [
    [
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
    ],
  ],
  baby_girl: [
    [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    ],
  ],
  baby_boy: [
    [
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    ],
  ],
  mini: [
    [
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=800&q=80',
    ],
  ],
  shoes_acc: [
    [
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    ],
  ],
}

// Zara Kids Templates by subcategory
const ZARA_KIDS_TEMPLATES: Record<
  ProductCategory,
  {
    title: string
    basePriceEur: number
    sizes: string[]
    colors: string[]
    composition: string
    desc: string
  }[]
> = {
  all: [],
  girl: [
    {
      title: 'Zara Kids Твидовое платье с контрастным воротником',
      basePriceEur: 29.95,
      sizes: ['6 лет (116 см)', '7 лет (122 см)', '8 лет (128 см)', '9-10 лет (140 см)', '11-12 лет (152 см)', '13-14 лет (164 см)'],
      colors: ['Мятный / Белый', 'Песочный', 'Пудровый'],
      composition: '65% хлопок, 35% полиэстер',
      desc: 'Элегантное платье из текстурированного твида с круглым вырезом и декоративными пуговицами спереди. Идеально для праздничных мероприятий.',
    },
    {
      title: 'Zara Kids Джинсы Wide Leg с высокой посадкой',
      basePriceEur: 25.95,
      sizes: ['6 лет (116 см)', '8 лет (128 см)', '10 лет (140 см)', '12 лет (152 см)', '14 лет (164 см)'],
      colors: ['Светло-голубой деним', 'Темно-синий', 'Черный'],
      composition: '100% органический хлопок',
      desc: 'Трендовые широкие джинсы из плотного натурального денима с регулируемой резинкой на поясе изнутри.',
    },
    {
      title: 'Zara Kids Свитшот с вышитым логотипом',
      basePriceEur: 19.95,
      sizes: ['6 лет (116 см)', '7 лет (122 см)', '8 лет (128 см)', '10 лет (140 см)', '12 лет (152 см)'],
      colors: ['Ванильный', 'Мятный', 'Сиреневый'],
      composition: '100% хлопок (футер с начесом)',
      desc: 'Уютный детский свитшот прямого кроя с мягким начесом внутри и объемной акцентной вышивкой.',
    },
    {
      title: 'Zara Kids Стеганая куртка с капюшоном',
      basePriceEur: 39.95,
      sizes: ['6 лет (116 см)', '8 лет (128 см)', '10 лет (140 см)', '12 лет (152 см)', '14 лет (164 см)'],
      colors: ['Бежевый', 'Темно-зеленый', 'Черный'],
      composition: '100% водоотталкивающий полиэстер',
      desc: 'Легкая и теплая куртка с синтетическим утеплителем и ветрозащитной планкой на молнии.',
    },
  ],
  boy: [
    {
      title: 'Zara Kids Худи Оверсайз с карманом-кенгуру',
      basePriceEur: 22.95,
      sizes: ['6 лет (116 см)', '7 лет (122 см)', '8 лет (128 см)', '9-10 лет (140 см)', '11-12 лет (152 см)', '13-14 лет (164 см)'],
      colors: ['Меланж', 'Оливковый', 'Темно-синий'],
      composition: '80% органический хлопок, 20% полиэстер',
      desc: 'Стильное детское худи со спущенным плечом и мягким начесом. Капюшон с подкладкой для дополнительного тепла.',
    },
    {
      title: 'Zara Kids Рубашка из хлопкового оксфорда',
      basePriceEur: 19.95,
      sizes: ['6 лет (116 см)', '8 лет (128 см)', '10 лет (140 см)', '12 лет (152 см)'],
      colors: ['Голубой', 'Белый', 'В полоску'],
      composition: '100% хлопок',
      desc: 'Классическая школьная и повседневная рубашка с воротником на пуговицах и нагрудным карманом.',
    },
    {
      title: 'Zara Kids Брюки карго с эластичным поясом',
      basePriceEur: 27.95,
      sizes: ['6 лет (116 см)', '8 лет (128 см)', '10 лет (140 см)', '12 лет (152 см)', '14 лет (164 см)'],
      colors: ['Хаки', 'Бежевый', 'Черный'],
      composition: '98% хлопок, 2% эластан',
      desc: 'Практичные брюки карго с накладными карманами по бокам и удобным поясом на кулиске.',
    },
  ],
  baby_girl: [
    {
      title: 'Zara Baby Трикотажный комбинезон с рюшами',
      basePriceEur: 22.95,
      sizes: ['9-12 мес (80 см)', '12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '3-4 года (104 см)', '5-6 лет (116 см)'],
      colors: ['Молочный', 'Нежно-розовый'],
      composition: '100% органический хлопковый трикотаж',
      desc: 'Мягчайший детский комбинезон с деликатными рюшами на плечиках и удобными кнопками по шаговому шву.',
    },
    {
      title: 'Zara Baby Платье из муслина с вышивкой',
      basePriceEur: 25.95,
      sizes: ['12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '4-5 лет (110 см)'],
      colors: ['Персиковый', 'Белый'],
      composition: '100% хлопковый муслин',
      desc: 'Воздушное муслиновое платье с мелким цветочным принтом. Дышащий материал не вызывает раздражений.',
    },
  ],
  baby_boy: [
    {
      title: 'Zara Baby Комплект: Свитшот и брюки из футера',
      basePriceEur: 25.95,
      sizes: ['9-12 мес (80 см)', '12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '3-4 года (104 см)', '5-6 лет (116 см)'],
      colors: ['Фисташковый / Песочный', 'Серый меланж'],
      composition: '100% органический хлопок',
      desc: 'Готовый трикотажный костюмчик для малыша. Брюки на мягкой резинке не давят на животик.',
    },
    {
      title: 'Zara Baby Ветровка на молнии с капюшоном',
      basePriceEur: 29.95,
      sizes: ['12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '4-5 лет (110 см)'],
      colors: ['Горчичный', 'Темно-синий'],
      composition: '100% полиэстер с хлопковой подкладкой',
      desc: 'Легкая ветрозащитная куртка с подкладкой из 100% хлопка для прогулок в прохладную погоду.',
    },
  ],
  mini: [
    {
      title: 'Zara Mini Набор из 3-х боди из органического хлопка',
      basePriceEur: 17.95,
      sizes: ['0-1 мес (50 см)', '1-3 мес (62 см)', '3-6 мес (68 см)', '6-9 мес (74 см)', '9-12 мес (80 см)'],
      colors: ['Белый / Молочный / Серый'],
      composition: '100% гипоаллергенный органический хлопок',
      desc: 'Набор бесшовных боди с запахом (kimono style) для легкого переодевания новорожденного.',
    },
    {
      title: 'Zara Mini Вязаный слип-комбинезон с капюшоном',
      basePriceEur: 27.95,
      sizes: ['1-3 мес (62 см)', '3-6 мес (68 см)', '6-9 мес (74 см)', '9-12 мес (80 см)'],
      colors: ['Песочный', 'Молочный'],
      composition: '100% мягкая шерсть с хлопком',
      desc: 'Уютный вязаный комбинезон с деревянными пуговичками и капюшоном с ушками.',
    },
  ],
  shoes_acc: [
    {
      title: 'Zara Kids Кожаные кеды на липучках',
      basePriceEur: 32.95,
      sizes: ['24 (15 см)', '26 (16.5 см)', '28 (17.5 см)', '30 (18.5 см)', '32 (20 см)', '34 (21.5 см)', '36 (23 см)'],
      colors: ['Белый / Бежевый', 'Темно-синий'],
      composition: '100% натуральная кожа, резиновая подошва',
      desc: 'Удобные детские кеды с анатомической стелькой и двумя надежными липучками.',
    },
    {
      title: 'Zara Kids Замшевые ботинки Chelsea',
      basePriceEur: 42.95,
      sizes: ['28 (17.5 см)', '30 (18.5 см)', '32 (20 см)', '34 (21.5 см)', '36 (23 см)'],
      colors: ['Шоколадный', 'Песочный'],
      composition: '100% натуральная замша',
      desc: 'Стильные ботинки челси с эластичными вставками по бокам для быстрой обувки.',
    },
  ],
}

function generateZaraKidsProducts(regionId: RegionId): Product[] {
  const reg = REGIONS[regionId] || REGIONS.spain
  const categories: ProductCategory[] = ['girl', 'boy', 'baby_girl', 'baby_boy', 'mini', 'shoes_acc']

  const products: Product[] = []
  let globalIdx = 1

  for (const cat of categories) {
    const templates = ZARA_KIDS_TEMPLATES[cat] || []
    const imageSets = KIDS_CATEGORY_IMAGES[cat] || []

    templates.forEach((tmpl, tIdx) => {
      const imgs = imageSets[tIdx % imageSets.length] || [
        'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
      ]

      let originalPrice = tmpl.basePriceEur
      if (reg.currency === 'GBP') originalPrice = Math.round(tmpl.basePriceEur * 0.85 * 100) / 100
      else if (reg.currency === 'PLN') originalPrice = Math.round(tmpl.basePriceEur * 4.3 * 100) / 100
      else if (reg.currency === 'KZT') originalPrice = Math.round(tmpl.basePriceEur * 500)

      const priceRub = Math.round(originalPrice * reg.exchangeRate)
      const sku = `ZK-${regionId.substring(0, 2).toUpperCase()}-${3000 + globalIdx}`

      products.push({
        id: `zara-kids-${regionId}-${cat}-${globalIdx}`,
        title: tmpl.title,
        brand: 'zara',
        region: regionId,
        category: cat,
        originalPrice,
        currencySymbol: reg.symbol,
        priceRub,
        description: tmpl.desc,
        composition: tmpl.composition,
        sku,
        originalUrl: `https://zara.com/${regionId}/kids/item/${sku.toLowerCase()}`,
        images: imgs,
        sizes: tmpl.sizes,
        colors: tmpl.colors,
        isNew: globalIdx % 2 === 0,
        isBestSeller: globalIdx % 3 === 0,
      })

      globalIdx++
    })
  }

  return products
}

const catalogCache: Record<string, Product[]> = {}

export const mockProductService = {
  async fetchProducts(
    _store: StoreId = 'zara',
    region: RegionId = 'spain',
    options?: { category?: ProductCategory | string; search?: string }
  ): Promise<Product[]> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const cacheKey = `zara-kids-${region}`
    if (!catalogCache[cacheKey]) {
      catalogCache[cacheKey] = generateZaraKidsProducts(region)
    }

    let result = catalogCache[cacheKey]

    if (options?.category && options.category !== 'all') {
      result = result.filter((p) => p.category === options.category)
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.composition && p.composition.toLowerCase().includes(q)) ||
          p.sku.toLowerCase().includes(q)
      )
    }

    return result
  },

  async getProductById(id: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    for (const key of Object.keys(catalogCache)) {
      const found = catalogCache[key].find((p) => p.id === id)
      if (found) return found
    }
    return null
  },
}
