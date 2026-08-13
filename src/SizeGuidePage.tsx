import { Link } from 'react-router-dom'

const BRAND_SIZE_INFO = [
  {
    brand: 'H&M',
    tagline: 'Всегда большемерит',
    details:
      'Например, если по бирке указан размер 80 — фактически это 80+6 см (хватит до роста 86 см).\nИсключение: нижнее белье и пижамы — идут строго в размер.',
    badge: 'Большемерит +6 см',
  },
  {
    brand: 'C&A',
    tagline: 'Чаще всего идет в размер',
    details:
      'В большинстве случаев размер 80 рассчитывается до роста 80 см. Бывают редкие исключения, когда вещи большемерят аналогично H&M.',
    badge: 'В размер',
  },
  {
    brand: 'ZARA',
    tagline: 'Идет в размер или маломерит',
    details:
      'Никогда не покупайте ZARA на фактический текущий рост ребенка. Всегда лучше брать на 1 размер больше, особенно если вы выбираете верхнюю одежду или куртки.',
    badge: 'Берите на размер больше',
  },
  {
    brand: 'NEXT',
    tagline: 'Большемерит (как H&M)',
    details:
      'У бренда почти всегда применяется удобный двойной размер на бирках. Ориентироваться нужно на вторую цифру: например, если указано 80–86, вещь отшита на рост 86 см с небольшим запасом.',
    badge: 'Ориентир на 2-ю цифру',
  },
]

export default function SizeGuidePage() {
  return (
    <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline mb-8 tracking-wide">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span className="text-outline/40">/</span>
        <span className="text-on-surface font-medium">Размерная сетка</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-3">
          Размерная сетка
        </h1>
        <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-xl">
          Особенности размерных рядов мировых брендов детской одежды, представленных в нашем магазине.
        </p>
      </div>

      {/* Intro block */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-sm md:text-base text-on-surface leading-relaxed">
          Поясним за особенности размерных сеток брендов, которые мы регулярно привозим в наличие.
        </p>
      </div>

      {/* Content List */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-8">
        {BRAND_SIZE_INFO.map((item) => (
          <div
            key={item.brand}
            className="py-5 flex gap-3.5 border-b border-gray-100 last:border-b-0 px-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface/25 shrink-0 mt-[9px]" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm md:text-base font-semibold text-on-surface">
                  {item.brand} — {item.tagline}
                </span>
              </div>
              <span className="text-sm md:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
                {item.details}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Note */}
      <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-5 mb-12">
        <p className="text-sm text-on-surface-variant leading-relaxed font-normal">
          <strong className="font-semibold text-on-surface">Все вещи уже в наличии в России!</strong> Доставка в любую точку страны — от 99 ₽ или <strong className="font-semibold text-primary">бесплатно</strong> при выполнении условий программы лояльности.
        </p>
      </div>

      {/* Minimal Action */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-primary hover:text-[#8b2691] transition-colors"
        >
          <span>Перейти к каталогу</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
