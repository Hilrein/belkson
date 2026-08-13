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
          Belkson — байер-сервис для легкого и безопасного выкупа оригинальных товаров из мировых интернет-магазинов и фирменных бутиков.
        </p>
      </div>

      {/* Ultra-Minimalist List Layout */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-12">
        {loading && activeItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-outline font-medium">
            Загрузка информации...
          </div>
        ) : (
          activeItems.map((block) => (
            <div
              key={block.id}
              className="py-7 border-b border-gray-100 last:border-b-0 px-2 flex flex-col gap-2.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-on-surface">
                  {block.title}
                </h3>
                {block.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 shrink-0">
                    {block.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed font-normal">
                {block.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Action Links */}
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
