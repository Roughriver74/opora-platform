import { useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Problems from './components/Problems'
import Solution from './components/Solution'
import Modules from './components/Modules'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Industries from './components/Industries'
import CtaSection from './components/CtaSection'
import Footer from './components/Footer'

function App() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="app">
      <Header />
      <Hero />
      <Problems />
      <Solution />
      <Modules />
      <HowItWorks />
      <Pricing />
      <Industries />
      <CtaSection />
      <Footer />
    </div>
  )
}

export default App
