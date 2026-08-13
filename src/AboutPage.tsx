import { Link } from 'react-router-dom'
import { useAboutSettings } from './store/AboutSettingsContext'

export default function AboutPage() {
  const { items, loading } = useAboutSettings()
  const activeItems = items.filter((item) => item.isActive)

  return (
    <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline mb-8 tracking-wide">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span className="text-outline/40">/</span>
        <span className="text-on-surface font-medium">О нас</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-3">
          О нас
        </h1>
        <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-xl">
          Магазин детской одежды BELKSON — только оригиналы любимых брендов.
        </p>
      </div>

      {/* Content List */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-12">
        {loading && activeItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-outline font-medium">
            Загрузка информации...
          </div>
        ) : (
          activeItems.map((block) => (
            <div
              key={block.id}
              className="py-5 flex flex-col gap-1 border-b border-gray-100 last:border-b-0 px-2"
            >
              {block.title && (
                <span className="text-base font-semibold text-on-surface">
                  {block.title}
                </span>
              )}
              <span className="text-sm text-outline font-normal leading-relaxed whitespace-pre-line">
                {block.content}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Minimal Action */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-primary hover:text-[#8b2691] transition-colors"
        >
          <span>Связаться с нами</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
