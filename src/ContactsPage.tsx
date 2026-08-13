import { Link } from 'react-router-dom'
import { getVkProfileUrl } from './lib/vk'

export default function ContactsPage() {
  const vkUrl = getVkProfileUrl()

  return (
    <main className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2 text-xs text-outline mb-6">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span>/</span>
        <span className="text-on-surface font-medium">Контакты</span>
      </div>

      <div className="max-w-3xl">
        <h1 className="font-display-lg-mobile md:font-display-lg text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">
          Контакты & Социальные сети
        </h1>
        <p className="text-on-surface-variant text-base md:text-lg leading-relaxed mb-10">
          Мы всегда на связи! Подписывайтесь на наш Telegram-канал и сообщество ВКонтакте, чтобы первыми узнавать о новинках, распродажах и свежих выкупах из Европы.
        </p>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {/* Telegram Channel Card */}
          <a
            href="https://t.me/Belksonshop"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] hover:border-primary/30 transition-all duration-300"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">send</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-1 group-hover:text-primary transition-colors">
                Telegram-канал
              </h3>
              <p className="text-xs text-outline mb-4">
                @Belksonshop — свежие выкупы, обзоры коллекций и анонсы.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
              <span>Открыть в Telegram</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </a>

          {/* VK Card */}
          <a
            href={vkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] hover:border-primary/30 transition-all duration-300"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-1 group-hover:text-primary transition-colors">
                Сообщество ВКонтакте
              </h3>
              <p className="text-xs text-outline mb-4">
                Официальная группа ВКонтакте с информацией и новостями.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
              <span>Перейти ВКонтакте</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </a>
        </div>

        {/* Schedule & Info */}
        <div className="p-6 md:p-8 bg-surface-container-low rounded-3xl border border-surface-dim flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div>
            <h4 className="font-bold text-base text-on-surface mb-1">Режим работы поддержки</h4>
            <p className="text-xs text-on-surface-variant">
              Принимаем заказы и отвечаем на сообщения ежедневно с 09:00 до 21:00 по МСК.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold text-sm rounded-full hover:bg-primary-hover transition-colors shrink-0"
          >
            <span>Перейти в каталог</span>
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
