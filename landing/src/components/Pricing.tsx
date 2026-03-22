import './Pricing.css'

const plans = [
  {
    name: 'Free',
    price: '0 ₽',
    period: 'навсегда',
    description: 'Для старта и тестирования',
    features: [
      { text: 'До 3 пользователей', included: true },
      { text: 'До 100 заявок / месяц', included: true },
      { text: 'До 100 визитов / месяц', included: true },
      { text: 'Все модули', included: true },
      { text: 'Bitrix24 интеграция', included: true },
      { text: 'PWA / Офлайн', included: true },
      { text: 'Кастомный брендинг', included: false },
      { text: 'Приоритетная поддержка', included: false },
    ],
    cta: 'Начать бесплатно',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '990 ₽',
    period: '/ пользователь / месяц',
    description: 'Для растущих команд',
    features: [
      { text: 'Безлимит пользователей', included: true },
      { text: 'Безлимит заявок', included: true },
      { text: 'Безлимит визитов', included: true },
      { text: 'Все модули', included: true },
      { text: 'Все интеграции', included: true },
      { text: 'PWA / Офлайн', included: true },
      { text: 'Кастомный брендинг', included: true },
      { text: 'Приоритетная поддержка', included: true },
    ],
    cta: 'Попробовать 14 дней бесплатно',
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="section-header">
          <div className="section-label">Тарифы</div>
          <h2 className="section-title">
            Простое <span className="gradient-text">ценообразование</span>
          </h2>
          <p className="section-subtitle">
            Начните бесплатно. Переходите на Pro когда перерастёте лимиты.
            Без скрытых платежей и обязательств.
          </p>
        </div>

        <div className="pricing__grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing__card animate-on-scroll ${plan.highlighted ? 'pricing__card--pro' : ''}`}
            >
              {plan.highlighted && (
                <div className="pricing__card-badge">Популярный</div>
              )}

              <div className="pricing__card-header">
                <h3 className="pricing__card-name">{plan.name}</h3>
                <p className="pricing__card-desc">{plan.description}</p>
              </div>

              <div className="pricing__card-price">
                <span className="pricing__card-amount">{plan.price}</span>
                <span className="pricing__card-period">{plan.period}</span>
              </div>

              <ul className="pricing__card-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={f.included ? '' : 'pricing__feature--disabled'}>
                    {f.included ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="9" fill="rgba(16, 185, 129, 0.15)" />
                        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="9" fill="rgba(255, 255, 255, 0.04)" />
                        <path d="M6 9h6" stroke="#55556a" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`btn btn-large pricing__card-cta ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
