import './HowItWorks.css'

const steps = [
  {
    number: '01',
    title: 'Регистрация',
    desc: 'Создайте организацию за 2 минуты. Укажите название, отрасль — и начинайте работать.',
    color: 'var(--accent-1)',
  },
  {
    number: '02',
    title: 'Настройка',
    desc: 'Включите нужные модули, создайте формы заявок, добавьте номенклатуру. Шаблоны для быстрого старта.',
    color: 'var(--accent-2)',
  },
  {
    number: '03',
    title: 'Приглашение команды',
    desc: 'Отправьте ссылку сотрудникам. Они откроют PWA-приложение с телефона — без установки из магазина.',
    color: 'var(--accent-3)',
  },
  {
    number: '04',
    title: 'Работа в поле',
    desc: 'Сотрудники фиксируют визиты и заявки прямо с телефона. Данные синхронизируются в реальном времени.',
    color: 'var(--accent-4)',
  },
]

export default function HowItWorks() {
  return (
    <section className="how-it-works">
      <div className="container">
        <div className="section-header">
          <div className="section-label">Как это работает</div>
          <h2 className="section-title">
            От регистрации до <span className="gradient-text-secondary">первого визита</span>
          </h2>
          <p className="section-subtitle">
            Четыре шага — и ваша полевая команда работает в единой системе
          </p>
        </div>

        <div className="how-it-works__timeline">
          {steps.map((s, i) => (
            <div key={i} className="how-it-works__step animate-on-scroll">
              <div className="how-it-works__step-number" style={{ color: s.color }}>
                {s.number}
              </div>
              <div className="how-it-works__step-connector">
                <div className="how-it-works__step-dot" style={{ background: s.color }} />
                {i < steps.length - 1 && <div className="how-it-works__step-line" />}
              </div>
              <div className="how-it-works__step-content">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
