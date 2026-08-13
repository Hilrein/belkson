import { Link } from 'react-router-dom'
import { getVkProfileUrl } from './lib/vk'

export default function ContactsPage() {
  const vkUrl = getVkProfileUrl()

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
          Связывайтесь с нами в удобном мессенджере или социальном канале. Мы с радостью проконсультируем вас по любым вопросам.
        </p>
      </div>

      {/* Ultra-Minimalist List Layout */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-12">
        {/* Telegram Channel */}
        <a
          href="https://t.me/Belksonshop"
          target="_blank"
          rel="noopener noreferrer"
          className="group py-5 flex items-center justify-between border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 px-2 rounded-xl transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-outline font-semibold w-24 shrink-0">
              Telegram
            </span>
            <div>
              <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors block">
                @Belksonshop
              </span>
              <span className="text-xs text-outline font-normal">
                Официальный канал с анонсами новинок и выкупов
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[20px] text-outline group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
            north_east
          </span>
        </a>

        {/* VK Community */}
        <a
          href={vkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group py-5 flex items-center justify-between border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 px-2 rounded-xl transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-outline font-semibold w-24 shrink-0">
              ВКонтакте
            </span>
            <div>
              <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors block">
                Сообщество Belkson
              </span>
              <span className="text-xs text-outline font-normal">
                Новости бренда, фотографии коллекций и консультации
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[20px] text-outline group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
            north_east
          </span>
        </a>

        {/* Working Hours */}
        <div className="py-5 flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-outline font-semibold w-24 shrink-0">
              Режим работы
            </span>
            <div>
              <span className="text-sm font-semibold text-on-surface block">
                09:00 — 21:00 МСК
              </span>
              <span className="text-xs text-outline font-normal">
                Ежедневно без выходных
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-outline shrink-0">
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
