import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg">
        <div className="mesh-bg" />
      </div>

      <div className="container hero__content">
        <div className="hero__text-content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            SaaS-платформа для полевых команд
          </div>

          <h1 className="hero__title">
            Управляйте командой<br />
            <span className="gradient-text">в поле</span> как в офисе
          </h1>

          <p className="hero__subtitle">
            Визиты, заказы, клиенты — всё в одной платформе.
            Работает онлайн и офлайн, интегрируется с вашей CRM.
          </p>

          <div className="hero__actions">
            <a href="#cta" className="btn btn-primary btn-large">
              Попробовать бесплатно
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#solution" className="btn btn-secondary btn-large">
              Узнать больше
            </a>
          </div>

          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-value">0 ₽</span>
              <span className="hero__stat-label">до 3 пользователей</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">PWA</span>
              <span className="hero__stat-label">работает офлайн</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">5 мин</span>
              <span className="hero__stat-label">настройка под вашу отрасль</span>
            </div>
          </div>
        </div>

        {/* Hero visual — Clean Corporate Dashboard Mockup */}
        <div className="hero__visual">
          <div className="hero__screen">
            <div className="hero__screen-header">
              <div className="hero__screen-logo">
                <div className="hero__logo-icon"></div>
                <div className="hero__logo-text"></div>
              </div>
              <div className="hero__screen-user"></div>
            </div>
            <div className="hero__screen-body">
              <div className="hero__screen-sidebar">
                <div className="hero__screen-nav-item hero__screen-nav-item--active" />
                <div className="hero__screen-nav-item" />
                <div className="hero__screen-nav-item" />
                <div className="hero__screen-nav-item" />
              </div>
              <div className="hero__screen-main">
                <div className="hero__screen-metrics">
                  <div className="hero__screen-metric-card" />
                  <div className="hero__screen-metric-card" />
                  <div className="hero__screen-metric-card" />
                </div>
                <div className="hero__screen-content-area">
                  <div className="hero__screen-table-header" />
                  <div className="hero__screen-table-row" />
                  <div className="hero__screen-table-row" />
                  <div className="hero__screen-table-row" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
