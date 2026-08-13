import { Link } from 'react-router-dom'

const DELIVERY_SECTIONS = [
  {
    title: 'Город отправки',
    content: 'Все заказы мы отправляем напрямую из г. Чехов (Московская область). Весь ассортимент сайта находится в наличии.',
  },
  {
    title: 'Сроки и службы доставки',
    content:
      'Отправка выполняется службами OZON, Яндекс Маркет и 5post в течение 1–2 рабочих дней после оформления и оплаты заказа.',
  },
  {
    title: 'Стоимость доставки',
    content: 'Стоимость доставки рассчитывается и оплачивается отдельно согласно тарифам выбранной логистической службы.',
  },
  {
    title: 'Условия возврата',
    content:
      'Возврат возможен в течение 7 дней после получения покупки при полном сохранении товарного вида, бирок и упаковки. Доставка возврата оплачивается покупателем.',
  },
]

export default function DeliveryPage() {
  return (
    <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-outline mb-8 tracking-wide">
        <Link to="/" className="hover:text-primary transition-colors">
          Главная
        </Link>
        <span className="text-outline/40">/</span>
        <span className="text-on-surface font-medium">Доставка и возврат</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-3">
          Доставка и возврат
        </h1>
        <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-xl">
          Информация о способах доставки, сроках отправки и правилах возврата товаров.
        </p>
      </div>

      {/* Content List */}
      <div className="flex flex-col border-t border-b border-gray-100 mb-12">
        {DELIVERY_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="py-5 flex gap-3.5 border-b border-gray-100 last:border-b-0 px-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface/25 shrink-0 mt-[9px]" />
            <div className="flex flex-col gap-1">
              <span className="text-sm md:text-base font-semibold text-on-surface">
                {section.title}
              </span>
              <span className="text-sm md:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
                {section.content}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Minimal Action */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-primary hover:text-[#8b2691] transition-colors"
        >
          <span>Задать вопрос по доставке</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  )
}
