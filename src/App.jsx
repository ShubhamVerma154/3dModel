import { useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import Scene from './three/Scene'
import { state } from './store'
import { Preloader, Cursor, Hud, ScrubText, SplitHeading, FadeUp, Counter, Scramble, Magnetic, gsap, ScrollTrigger } from './components/ui'

const SERVICES = [
  { t: 'Website Development', d: 'Custom websites, Shopify storefronts, landing pages and PHP/React dashboards — fast, accessible, built to scale.' },
  { t: 'UI / UX Design', d: 'Conversion-first interfaces designed around how your customers actually browse, compare and buy.' },
  { t: 'SEO & AI Search', d: 'Technical SEO baked into the build, plus content and entity work so you are found on Google and inside AI answers.' },
  { t: 'Paid Media', d: 'Google, Meta and LinkedIn campaigns that send the right traffic to pages built to convert it.' },
  { t: 'Branding & Social', d: 'Positioning, identity and an intentional social presence that matches the quality of the site.' },
  { t: 'Support & Optimisation', d: 'Hosting, updates, speed tuning and monthly growth reporting — we stay on after launch.' },
]

const PROCESS = [
  { n: '01', t: 'Discover', d: 'Audit your current site, market and data before a single line of code or ad is written.' },
  { n: '02', t: 'Design', d: 'Wireframes and UI built around your customers’ journey and your conversion goals.' },
  { n: '03', t: 'Develop', d: 'Clean, fast, SEO-ready code shipped by a small senior team — no hand-offs to juniors.' },
  { n: '04', t: 'Launch & Grow', d: 'Go live, then drive traffic with SEO and paid media, and optimise every week.' },
]

const WORK = [
  { name: 'Restroom Resources', tag: 'Web · SEO' },
  { name: 'Rep Indie', tag: 'Brand · Social' },
  { name: 'Limoges Beauty', tag: 'Shopify · Paid' },
  { name: 'Top Fly Solutions', tag: 'Web · Strategy' },
  { name: 'Fluidity', tag: 'Brand · Web' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const onLoaded = useCallback(() => {
    state.ready = true
    setReady(true)
  }, [])

  // Smooth scroll (Lenis) wired into GSAP ScrollTrigger + shared state
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
    lenis.on('scroll', (l) => {
      state.scrollY = l.scroll
      state.velocity = l.velocity
      ScrollTrigger.update()
    })
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // decay velocity when idle
    const decay = gsap.ticker.add(() => (state.velocity *= 0.92))

    const onMove = (e) => {
      state.mouse.x = (e.clientX / innerWidth) * 2 - 1
      state.mouse.y = -((e.clientY / innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)

    // in-page anchor links use lenis
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a || a.getAttribute('href') === '#') return
      e.preventDefault()
      lenis.scrollTo(a.getAttribute('href'), { duration: 2 })
    }
    document.addEventListener('click', onClick)

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.remove(decay)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('click', onClick)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      <Preloader onDone={onLoaded} />
      <Scene />
      <Cursor />
      <Hud />
      <div className="grain" />

      <header className="nav">
        <a href="#hero" className="logo">
          CYBER<span>NEXT</span>
        </a>
        <nav>
          {['about', 'services', 'process', 'work', 'contact'].map((s) => (
            <a key={s} href={`#${s}`} className="mono">
              <Scramble text={s.toUpperCase()} />
            </a>
          ))}
        </nav>
        <Magnetic href="#contact" className="btn btn--sm">Let’s talk</Magnetic>
      </header>

      <main>
        {/* ---------- 01 HERO ---------- */}
        <section id="hero" data-drone="hero" className="section hero">
          <div className="mono tag">[ WEB DEVELOPMENT + DIGITAL MARKETING · SINCE 2014 ]</div>
          {ready && (
            <SplitHeading
              as="h1"
              immediate
              delay={0.3}
              className="hero__title"
              lines={['We build', 'websites', 'that grow.']}
            />
          )}
          <div className="hero__foot">
            <p className={`hero__sub ${ready ? 'in' : ''}`}>
              CyberNext designs, develops and markets websites for brands that have outgrown recycled templates and recycled marketing.
            </p>
            <div className={`scroll-cue mono ${ready ? 'in' : ''}`}>
              <span /> SCROLL TO BUILD
            </div>
          </div>
        </section>

        {/* ---------- 02 ABOUT ---------- */}
        <section id="about" data-drone="about" className="section split split--left">
          <div className="col">
            <div className="mono tag">[ 02 — WHO WE ARE ]</div>
            <ScrubText className="big-copy">
              We are a small senior team of developers, designers and marketers. We write the code, ship the site, then drive the traffic — no templates, no recycled playbooks, and we’d rather be honest than say yes to everything.
            </ScrubText>
            <FadeUp className="pill-row">
              <span className="pill">India</span>
              <span className="pill">Canada</span>
              <span className="pill">Worldwide clients</span>
            </FadeUp>
          </div>
        </section>

        {/* ---------- 03 SERVICES ---------- */}
        <section id="services" data-drone="services" className="section split split--right tall">
          <div className="col">
            <div className="mono tag">[ 03 — THE STACK ]</div>
            <SplitHeading lines={['What we', 'build & grow.']} className="h2" />
            <ul className="services">
              {SERVICES.map((s, i) => (
                <FadeUp as="li" key={s.t} delay={i * 0.05} className="service" >
                  <div className="service__head" data-hover>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{s.t}</h3>
                    <span className="service__plus">+</span>
                  </div>
                  <p>{s.d}</p>
                </FadeUp>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- 04 PROCESS (scan beam) ---------- */}
        <section id="process" data-drone="scan" className="section process">
          <div className="process__head">
            <div className="mono tag">[ 04 — BUILD PIPELINE ]</div>
            <SplitHeading lines={['From first commit', 'to first customer.']} className="h2 center" />
          </div>
          <div className="process__grid">
            {PROCESS.map((p, i) => (
              <FadeUp key={p.n} delay={i * 0.08} className="card">
                <div className="card__top mono">
                  <span>{p.n}</span>
                  <span className="card__status">● ONLINE</span>
                </div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ---------- 05 STATS ---------- */}
        <section id="numbers" data-drone="stats" className="section split split--left">
          <div className="col">
            <div className="mono tag">[ 05 — PERFORMANCE ]</div>
            <SplitHeading lines={['Shipped, measured,', 'scaled.']} className="h2" />
            <div className="stats">
              <FadeUp className="stat"><b><Counter to={12} suffix="+" /></b><span className="mono">Years shipping</span></FadeUp>
              <FadeUp className="stat" delay={0.08}><b><Counter to={2} /></b><span className="mono">Offices · IN / CA</span></FadeUp>
              <FadeUp className="stat" delay={0.16}><b><Counter to={150} suffix="+" /></b><span className="mono">Projects shipped</span></FadeUp>
              <FadeUp className="stat" delay={0.24}><b><Counter to={6} /></b><span className="mono">Core disciplines</span></FadeUp>
            </div>
          </div>
        </section>

        {/* ---------- 06 WORK ---------- */}
        <section id="work" data-drone="work" className="section split split--right">
          <div className="col">
            <div className="mono tag">[ 06 — DEPLOYED ]</div>
            <SplitHeading lines={['Selected', 'work.']} className="h2" />
            <ul className="work">
              {WORK.map((w, i) => (
                <FadeUp as="li" key={w.name} delay={i * 0.05}>
                  <a href="https://cybernext.io/" target="_blank" rel="noreferrer" className="work__row">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className="work__name">{w.name}</span>
                    <span className="mono work__tag">{w.tag}</span>
                    <span className="work__arrow">↗</span>
                  </a>
                </FadeUp>
              ))}
            </ul>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k}>
                SEO <i>✦</i> PAID MEDIA <i>✦</i> BRANDING <i>✦</i> WEB DEVELOPMENT <i>✦</i> SOCIAL <i>✦</i> AI SEARCH <i>✦</i>{' '}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- 07 CONTACT ---------- */}
        <section id="contact" data-drone="contact" className="section contact">
          <div className="mono tag">[ 07 — git push origin growth ]</div>
          <SplitHeading lines={['Let’s build', 'your next', 'website.']} className="contact__title" />
          <FadeUp className="contact__cta">
            <Magnetic href="https://cybernext.io/" className="btn btn--lg">Start a project →</Magnetic>
          </FadeUp>
          <footer className="footer mono">
            <div>
              <b>INDIA</b>
              <span>Sahibzada Ajit Singh Nagar, Punjab 160062</span>
              <span>0172 410 8940</span>
            </div>
            <div>
              <b>CANADA</b>
              <span>130 King Street West, Toronto, M5X 1E3</span>
            </div>
            <div>
              <b>FOLLOW</b>
              <span>Instagram · LinkedIn</span>
            </div>
            <div className="footer__copy">© {new Date().getFullYear()} CyberNext</div>
          </footer>
        </section>
      </main>
    </>
  )
}
