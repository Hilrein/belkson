import { Link } from 'react-router-dom'
import { useAboutSettings } from './store/AboutSettingsContext'

export default function AboutPage() {
  const { items, loading } = useAboutSettings()
  const activeItems = items.filter((item) => item.isActive)

  const introBlock = activeItems.length > 0 ? activeItems[0] : null
  const middleBlocks = activeItems.slice(1, -1)
  const closingBlock = activeItems.length > 1 ? activeItems[activeItems.length - 1] : null

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

      {loading && activeItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-outline font-medium">
          Загрузка информации...
        </div>
      ) : (
        <>
          {/* Intro — uniform size */}
          {introBlock && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <p className="text-sm md:text-base text-on-surface leading-relaxed whitespace-pre-line">
                {introBlock.content}
              </p>
            </div>
          )}

          {/* Middle blocks — uniform text size */}
          <div className="flex flex-col border-t border-b border-gray-100 mb-6">
            {middleBlocks.map((block) => (
              <div
                key={block.id}
                className="py-4 flex gap-3.5 border-b border-gray-100 last:border-b-0 px-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-on-surface/25 shrink-0 mt-[9px]" />
                <div className="flex flex-col gap-1">
                  {block.title && (
                    <span className="text-sm md:text-base font-semibold text-on-surface">
                      {block.title}
                    </span>
                  )}
                  <span className="text-sm md:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {block.content}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Closing — uniform text size */}
          {closingBlock && (
            <p className="text-sm md:text-base text-on-surface-variant italic leading-relaxed mb-8 px-2">
              {closingBlock.content}
            </p>
          )}
        </>
      )}

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
