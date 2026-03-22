import './Problems.css'

const problems = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    title: 'Данные теряются',
    description: 'Полевые сотрудники записывают в блокноты и мессенджеры. Информация дублируется, теряется, вводится вручную.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Нет контроля',
    description: 'Руководитель не видит что происходит в поле. Отчёты приходят в конце дня — или не приходят вообще.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'Нет мобильности',
    description: 'CRM-системы создавались для офиса. Попробуйте заполнить Bitrix24 с телефона на складе клиента.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Дорого и сложно',
    description: 'Готовые решения стоят от 30 000 ₽/мес и требуют месяцы на внедрение. Малому бизнесу это не по карману.',
  },
]

export default function Problems() {
  return (
    <section className="problems">
      <div className="container">
        <div className="section-header">
          <div className="section-label">Проблема</div>
          <h2 className="section-title">
            Полевые команды работают <span className="gradient-text-warn">вслепую</span>
          </h2>
          <p className="section-subtitle">
            80% компаний с полевыми сотрудниками теряют до 30% заявок из-за ручного ввода данных
          </p>
        </div>

        <div className="problems__grid">
          {problems.map((p, i) => (
            <div key={i} className="problems__card animate-on-scroll">
              <div className="problems__card-icon">{p.icon}</div>
              <h3 className="problems__card-title">{p.title}</h3>
              <p className="problems__card-desc">{p.description}</p>
              <div className="problems__card-line" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
