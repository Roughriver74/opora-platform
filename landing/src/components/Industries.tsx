import './Industries.css'

const industries = [
  {
    icon: '🏗️',
    title: 'Стройматериалы',
    desc: 'Бетон, ЖБИ, кирпич, кровля. Заявки с объекта, расчёт объёмов, доставка.',
  },
  {
    icon: '💊',
    title: 'Фармацевтика',
    desc: 'Медпреды, визиты к врачам, промо-материалы, отчёты по клиникам.',
  },
  {
    icon: '🛒',
    title: 'FMCG',
    desc: 'Торговые представители, мерчандайзинг, заказы, остатки на полках.',
  },
  {
    icon: '🔧',
    title: 'Сервис и обслуживание',
    desc: 'Выездные инженеры, акты выполненных работ, запчасти, SLA.',
  },
  {
    icon: '🏭',
    title: 'Промышленное оборудование',
    desc: 'B2B продажи, технические спецификации, тендеры, пуско-наладка.',
  },
  {
    icon: '🌾',
    title: 'Агро и дистрибуция',
    desc: 'Региональные менеджеры, маршруты по точкам, сезонные заказы.',
  },
]

export default function Industries() {
  return (
    <section className="industries" id="industries">
      <div className="container">
        <div className="section-header">
          <div className="section-label">Отрасли</div>
          <h2 className="section-title">
            Одна платформа — <span className="gradient-text-secondary">любая отрасль</span>
          </h2>
          <p className="section-subtitle">
            Динамические формы и модульная архитектура позволяют настроить ОПОРА под любой бизнес с полевыми сотрудниками
          </p>
        </div>

        <div className="industries__grid">
          {industries.map((ind, i) => (
            <div key={i} className="industries__card animate-on-scroll">
              <div className="industries__card-icon">{ind.icon}</div>
              <h3 className="industries__card-title">{ind.title}</h3>
              <p className="industries__card-desc">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
