import { Link } from 'react-router-dom'
import { useAboutSettings } from './store/AboutSettingsContext'

export default function AboutPage() {
  const { items, loading } = useAboutSettings()
  const activeItems = items.filter((item) => item.isActive)

  return (
    <main className="max-w-[640px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline mb-10 tracking-wide">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span className="text-outline/40">/</span>
        <span className="text-on-surface font-medium">О нас</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-10">
        О нас
      </h1>

      {/* Content */}
      {loading && activeItems.length === 0 ? (
        <p className="text-sm text-outline">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          {activeItems.map((block) => (
            <div key={block.id}>
              {block.title && (
                <h3 className="text-sm font-semibold text-on-surface mb-1.5 tracking-wide">
                  {block.title}
                </h3>
              )}
              <p className="text-sm text-on-surface-variant leading-[1.75] whitespace-pre-line">
                {block.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-14 pt-6 border-t border-gray-100">
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
