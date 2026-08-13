import { Link } from 'react-router-dom'
import { useContactsSettings, type ContactItem } from './store/ContactsSettingsContext'

function getContactUrl(item: ContactItem): string {
  const val = item.value?.trim() || ''
  if (!val) return '#'

  if (val.startsWith('http://') || val.startsWith('https://')) {
    return val
  }

  if (item.id.includes('telegram') || item.label.toLowerCase().includes('telegram')) {
    const clean = val.replace(/^@/, '')
    return `https://t.me/${clean}`
  }

  if (item.id.includes('vk') || item.label.toLowerCase().includes('vk')) {
    const clean = val.replace(/^@/, '')
    if (clean.startsWith('club') || clean.startsWith('public') || /^\d+$/.test(clean)) {
      return `https://vk.com/${clean.startsWith('club') || clean.startsWith('public') ? clean : 'club' + clean}`
    }
    return `https://vk.com/${clean}`
  }

  return val
}

export default function ContactsPage() {
  const { items, loading } = useContactsSettings()
  const activeContacts = items.filter((s) => s.isActive)

  return (
    <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline mb-8 tracking-wide">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span className="text-outline/40">/</span>
        <span className="text-on-surface font-medium">Контакты</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-3">
          Контакты
        </h1>
        <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-xl">
          Связывайтесь с нами в удобном мессенджере или социальном канале. Все способы связи управляются из панели администратора.
        </p>
      </div>

      {/* Ultra-Minimalist List Layout */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-12">
        {loading && activeContacts.length === 0 ? (
          <div className="py-8 text-center text-xs text-outline font-medium">
            Загрузка контактов...
          </div>
        ) : (
          activeContacts.map((contact) => {
            const url = getContactUrl(contact)

            return (
              <a
                key={contact.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group py-5 flex items-start justify-between border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 px-2 rounded-xl transition-all duration-200"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {contact.label || contact.id.toUpperCase()}
                  </span>
                  <span className="text-xs text-outline font-normal">
                    {contact.description || contact.value}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[20px] text-outline group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all mt-0.5">
                  north_east
                </span>
              </a>
            )
          })
        )}

        {/* Working Hours */}
        <div className="py-5 flex items-start justify-between px-2 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-on-surface">
              Режим работы
            </span>
            <span className="text-xs text-outline font-normal">
              Принимаем заказы и отвечаем на сообщения ежедневно с 09:00 до 21:00 по МСК
            </span>
          </div>
          <span className="text-xs font-mono text-outline shrink-0 mt-0.5">
            Онлайн
          </span>
        </div>
      </div>

      {/* Minimal Action */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-primary hover:text-[#8b2691] transition-colors"
        >
          <span>Перейти к каталогу товаров</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
