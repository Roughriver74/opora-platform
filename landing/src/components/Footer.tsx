import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__logo">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="20" width="8" height="10" rx="1" fill="url(#fg1)" />
                <rect x="12" y="12" width="8" height="18" rx="1" fill="url(#fg2)" />
                <rect x="22" y="4" width="8" height="26" rx="1" fill="url(#fg3)" />
                <defs>
                  <linearGradient id="fg1" x1="2" y1="20" x2="10" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="fg2" x1="12" y1="12" x2="20" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="fg3" x1="22" y1="4" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#06b6d4" /><stop offset="1" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <span>OPORA</span>
            </div>
            <p className="footer__tagline">
              Облачная Платформа Организации<br />Рабочих Активностей
            </p>
          </div>

          <div className="footer__links">
            <div className="footer__col">
              <h4>Продукт</h4>
              <a href="#solution">Возможности</a>
              <a href="#modules">Модули</a>
              <a href="#pricing">Тарифы</a>
              <a href="#industries">Отрасли</a>
            </div>
            <div className="footer__col">
              <h4>Ресурсы</h4>
              <a href="#">Документация</a>
              <a href="#">API</a>
              <a href="#">Блог</a>
              <a href="#">Статус</a>
            </div>
            <div className="footer__col">
              <h4>Компания</h4>
              <a href="#">О нас</a>
              <a href="#">Контакты</a>
              <a href="#">Политика конфиденциальности</a>
              <a href="#">Условия использования</a>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {new Date().getFullYear()} ОПОРА. Все права защищены.</p>
        </div>
      </div>
    </footer>
  )
}
