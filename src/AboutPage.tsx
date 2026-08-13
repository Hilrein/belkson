import { Link } from 'react-router-dom'
import { useAboutSettings } from './store/AboutSettingsContext'

export default function AboutPage() {
  const { items, loading } = useAboutSettings()
  const activeItems = items.filter((item) => item.isActive)

  /* Split first block (intro) from the rest for distinct styling */
  const introBlock = activeItems.length > 0 ? activeItems[0] : null
  const restBlocks = activeItems.slice(1)

  return (
    <main className="max-w-[600px] mx-auto px-margin-mobile md:px-margin-desktop py-14 md:py-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[11px] text-outline mb-14 tracking-[0.14em] uppercase font-medium">
        <Link to="/" className="hover:text-on-surface transition-colors">
          Главная
        </Link>
        <span className="text-outline/25">—</span>
        <span className="text-on-surface">О нас</span>
      </nav>

      {/* Title — serif */}
      <h1
        className="text-on-surface mb-16"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(32px, 5vw, 44px)',
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        О нас
      </h1>

      {loading && activeItems.length === 0 ? (
        <p className="text-[13px] text-outline tracking-wide">Загрузка…</p>
      ) : (
        <article>
          {/* Intro block — larger serif text */}
          {introBlock && (
            <div className="mb-12 pb-12 border-b border-gray-100">
              <p
                className="text-on-surface whitespace-pre-line"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(18px, 2.5vw, 22px)',
                  fontWeight: 500,
                  lineHeight: 1.7,
                  letterSpacing: '0.005em',
                }}
              >
                {introBlock.content}
              </p>
            </div>
          )}

          {/* Remaining blocks — clean sans-serif */}
          <div className="space-y-7">
            {restBlocks.map((block) => (
              <div key={block.id}>
                {block.title && (
                  <h3
                    className="text-on-surface mb-2"
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      lineHeight: 1.3,
                    }}
                  >
                    {block.title}
                  </h3>
                )}
                <p
                  className="text-on-surface-variant whitespace-pre-line"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '13.5px',
                    lineHeight: 1.85,
                    letterSpacing: '0.01em',
                  }}
                >
                  {block.content}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Footer link */}
      <div className="mt-16 pt-8 border-t border-gray-100">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-on-surface hover:text-primary transition-colors"
        >
          <span>Связаться с нами</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
