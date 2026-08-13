import { Link } from 'react-router-dom'
import { useAboutSettings } from './store/AboutSettingsContext'

export default function AboutPage() {
  const { items, loading } = useAboutSettings()
  const activeItems = items.filter((item) => item.isActive)

  return (
    <main className="max-w-[560px] mx-auto px-margin-mobile md:px-margin-desktop py-14 md:py-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[11px] text-outline mb-12 tracking-widest uppercase">
        <Link to="/" className="hover:text-on-surface transition-colors">
          Главная
        </Link>
        <span className="text-outline/30">/</span>
        <span className="text-on-surface">О нас</span>
      </nav>

      {/* Title */}
      <h1 className="text-[28px] md:text-[36px] font-bold tracking-[-0.02em] leading-[1.15] text-on-surface mb-14">
        О нас
      </h1>

      {/* Content */}
      {loading && activeItems.length === 0 ? (
        <p className="text-[13px] text-outline tracking-wide">Загрузка…</p>
      ) : (
        <div className="space-y-8">
          {activeItems.map((block) => (
            <div key={block.id}>
              {block.title && (
                <h3 className="text-[13px] font-bold text-on-surface mb-2 uppercase tracking-[0.08em]">
                  {block.title}
                </h3>
              )}
              <p className="text-[14px] md:text-[15px] text-on-surface-variant leading-[1.8] whitespace-pre-line tracking-[0.005em]">
                {block.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-16 pt-8 border-t border-gray-100">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-bold text-on-surface hover:text-primary transition-colors"
        >
          <span>Связаться с нами</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
