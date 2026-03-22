import './CtaSection.css'

export default function CtaSection() {
  return (
    <section className="cta-section" id="cta">
      <div className="cta-section__bg">
        <div className="cta-section__orb cta-section__orb--1" />
        <div className="cta-section__orb cta-section__orb--2" />
        <div className="mesh-bg" />
      </div>

      <div className="container cta-section__content">
        <div className="animate-on-scroll">
          <h2 className="cta-section__title">
            Готовы навести порядок<br />
            <span className="gradient-text">в полевых операциях?</span>
          </h2>
          <p className="cta-section__subtitle">
            Начните бесплатно — до 3 пользователей, до 100 заявок в месяц.
            Без привязки карты, без обязательств.
          </p>

          <form className="cta-section__form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Ваш email"
              className="cta-section__input"
              required
            />
            <button type="submit" className="btn btn-primary btn-large cta-section__btn">
              Попробовать бесплатно
            </button>
          </form>

          <p className="cta-section__note">
            Регистрация занимает 2 минуты. Никакого спама — только доступ к платформе.
          </p>
        </div>
      </div>
    </section>
  )
}
