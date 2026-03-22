import { useState } from 'react'
import './Modules.css'

const modules = [
  {
    id: 'orders',
    title: 'Заказы',
    subtitle: 'Динамические формы, заявки, номенклатура',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: '#3b82f6',
    features: [
      'Конструктор форм с drag-and-drop',
      'Автоматическая нумерация заявок',
      'Каталог номенклатуры с категориями',
      'Привязка заявок к компаниям и контактам',
      'Статусы и воронка обработки',
    ],
  },
  {
    id: 'visits',
    title: 'Визиты',
    subtitle: 'Планирование, маршруты, отчёты',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>
      </svg>
    ),
    color: '#8b5cf6',
    features: [
      'Планирование визитов на карте',
      'Статусы: план → факт → завершён',
      'Динамические поля для отчётов',
      'Календарь визитов по сотрудникам',
      'Маршруты и оптимизация перемещений',
    ],
  },
  {
    id: 'integrations',
    title: 'Интеграции',
    subtitle: 'Bitrix24, 1C, AmoCRM',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/>
      </svg>
    ),
    color: '#06b6d4',
    features: [
      'Двусторонняя синхронизация данных',
      'Маппинг полей per организация',
      'Bitrix24: сделки, контакты, компании',
      'Подключение и отключение без потерь',
      'В будущем: 1С, AmoCRM, Мой Склад',
    ],
  },
  {
    id: 'pwa',
    title: 'Офлайн',
    subtitle: 'PWA, работает без интернета',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
    color: '#10b981',
    features: [
      'Приложение открывается без сети',
      'Создание визитов и заявок офлайн',
      'Автоматическая синхронизация',
      'Индикатор статуса подключения',
      'Разрешение конфликтов данных',
    ],
  },
]

export default function Modules() {
  const [active, setActive] = useState(0)

  return (
    <section className="modules" id="modules">
      <div className="container">
        <div className="section-header">
          <div className="section-label">Модули</div>
          <h2 className="section-title">
            Включайте только то, <span className="gradient-text">что нужно</span>
          </h2>
          <p className="section-subtitle">
            Каждый модуль — независимый. Начните с заказов, добавьте визиты позже.
            Интеграции — когда будете готовы.
          </p>
        </div>

        <div className="modules__layout">
          <div className="modules__tabs">
            {modules.map((m, i) => (
              <button
                key={m.id}
                className={`modules__tab ${active === i ? 'modules__tab--active' : ''}`}
                onClick={() => setActive(i)}
                style={{ '--tab-color': m.color } as React.CSSProperties}
              >
                <div className="modules__tab-icon">{m.icon}</div>
                <div className="modules__tab-text">
                  <span className="modules__tab-title">{m.title}</span>
                  <span className="modules__tab-subtitle">{m.subtitle}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="modules__content glass-card">
            <div className="modules__content-header">
              <div
                className="modules__content-icon"
                style={{ background: `${modules[active].color}15`, color: modules[active].color }}
              >
                {modules[active].icon}
              </div>
              <div>
                <h3 className="modules__content-title">{modules[active].title}</h3>
                <p className="modules__content-subtitle">{modules[active].subtitle}</p>
              </div>
            </div>

            <ul className="modules__features">
              {modules[active].features.map((f, i) => (
                <li key={i} className="modules__feature">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill={`${modules[active].color}20`} />
                    <path d="M6 10l3 3 5-5" stroke={modules[active].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="modules__content-badge">
              Включается одним переключателем в настройках организации
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
