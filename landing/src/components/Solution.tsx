import './Solution.css'

const features = [
  {
    title: 'Полностью автономная',
    desc: 'Все данные — ваши. Компании, контакты, заявки хранятся в ОПОРА. Никаких зависимостей от внешних систем.',
    gradient: 'var(--gradient-primary)',
  },
  {
    title: 'Модульная',
    desc: 'Включайте только то, что нужно: заказы, визиты, интеграции, офлайн-режим. Каждый модуль — опционален.',
    gradient: 'var(--gradient-secondary)',
  },
  {
    title: 'Мобильная',
    desc: 'PWA-приложение работает с телефона как нативное. Оффлайн-режим для работы без интернета.',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
  },
  {
    title: 'Интегрируемая',
    desc: 'Подключите Bitrix24, 1С или AmoCRM когда будете готовы. Двусторонняя синхронизация без потерь данных.',
    gradient: 'var(--gradient-warm)',
  },
]

export default function Solution() {
  return (
    <section className="solution" id="solution">
      <div className="container">
        <div className="solution__layout">
          <div className="solution__left animate-on-scroll">
            <div className="section-label">Решение</div>
            <h2 className="section-title">
              Одна платформа для<br />
              <span className="gradient-text">всей полевой команды</span>
            </h2>
            <p className="solution__desc">
              ОПОРА объединяет управление визитами, заказами и клиентами
              в единую систему, созданную специально для работы в поле.
              Не адаптация офисной CRM — а инструмент, спроектированный
              для мобильных сотрудников с первого дня.
            </p>

            <div className="solution__highlight">
              <div className="solution__highlight-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <strong>Ваши данные — ваши.</strong>
                <span> Интеграции — мост, а не зависимость. Отключите CRM — ОПОРА продолжит работать.</span>
              </div>
            </div>
          </div>

          <div className="solution__right">
            {features.map((f, i) => (
              <div key={i} className="solution__feature animate-on-scroll">
                <div className="solution__feature-accent" style={{ background: f.gradient }} />
                <h3 className="solution__feature-title">{f.title}</h3>
                <p className="solution__feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
