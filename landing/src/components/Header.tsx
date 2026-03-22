import { useState, useEffect } from 'react'
import './Header.css'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="container header__inner">
        <a href="#" className="header__logo">
          <div className="header__logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="20" width="8" height="10" rx="1" fill="url(#g1)" />
              <rect x="12" y="12" width="8" height="18" rx="1" fill="url(#g2)" />
              <rect x="22" y="4" width="8" height="26" rx="1" fill="url(#g3)" />
              <defs>
                <linearGradient id="g1" x1="2" y1="20" x2="10" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="g2" x1="12" y1="12" x2="20" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="g3" x1="22" y1="4" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" /><stop offset="1" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="header__logo-text">OPORA</span>
        </a>

        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
          <a href="#solution" onClick={() => setMenuOpen(false)}>Возможности</a>
          <a href="#modules" onClick={() => setMenuOpen(false)}>Модули</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Тарифы</a>
          <a href="#industries" onClick={() => setMenuOpen(false)}>Отрасли</a>
        </nav>

        <div className="header__actions">
          <a href="#cta" className="btn btn-primary header__cta">
            Попробовать бесплатно
          </a>
          <button
            className={`header__burger ${menuOpen ? 'header__burger--open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
