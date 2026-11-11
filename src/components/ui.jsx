import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { state, hud } from '../store'

gsap.registerPlugin(ScrollTrigger)

/* ---------------- Preloader ---------------- */
export function Preloader({ onDone }) {
  const [n, setN] = useState(0)
  const [hide, setHide] = useState(false)
  useEffect(() => {
    const o = { v: 0 }
    const tw = gsap.to(o, {
      v: 100,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => setN(Math.round(o.v)),
      onComplete: () => {
        setHide(true)
        onDone()
      },
    })
    return () => tw.kill()
  }, [onDone])
  return (
    <div className={`preloader ${hide ? 'is-hidden' : ''}`}>
      <div className="mono preloader__top">[ CN-DEV // COMPILING ]</div>
      <div className="preloader__count">{String(n).padStart(3, '0')}</div>
      <div className="preloader__bar"><span style={{ transform: `scaleX(${n / 100})` }} /></div>
      <div className="mono preloader__bottom">BUNDLING ASSETS · OPTIMISING CORE WEB VITALS</div>
    </div>
  )
}

/* ---------------- Custom cursor ---------------- */
export function Cursor() {
  const dot = useRef()
  const ring = useRef()
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const pos = { x: innerWidth / 2, y: innerHeight / 2 }
    const r = { ...pos }
    let raf
    const move = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
      const hot = e.target.closest('a, button, [data-hover]')
      ring.current?.classList.toggle('is-hot', !!hot)
    }
    const loop = () => {
      r.x += (pos.x - r.x) * 0.16
      r.y += (pos.y - r.y) * 0.16
      if (dot.current) dot.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`
      if (ring.current) ring.current.style.transform = `translate(${r.x}px, ${r.y}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    loop()
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <>
      <div ref={ring} className="cursor-ring" />
      <div ref={dot} className="cursor-dot" />
    </>
  )
}

/* ---------------- Telemetry HUD (written to by the 3D scene) ---------------- */
const LABELS = { hero: 'LAUNCH', about: 'ABOUT', services: 'SERVICES', scan: 'PROCESS', stats: 'NUMBERS', work: 'WORK', contact: 'CONTACT' }
export function Hud() {
  const [section, setSection] = useState({ i: 1, key: 'hero' })
  const bar = useRef()
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-drone]')]
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSection({ i: els.indexOf(e.target) + 1, key: e.target.dataset.drone })),
      { rootMargin: '-50% 0px -50% 0px' }
    )
    els.forEach((el) => io.observe(el))
    const onScroll = () => {
      const p = state.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)
      if (bar.current) bar.current.style.transform = `scaleY(${p})`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return (
    <div className="hud mono">
      <div className="hud__tl">
        <span className="blink">●</span> LIVE · BUILD #2014
      </div>
      <div className="hud__bl">
        <div>X <b ref={(e) => (hud.x = e)}>0.00</b></div>
        <div>ALT <b ref={(e) => (hud.y = e)}>0.00</b></div>
        <div>Z <b ref={(e) => (hud.z = e)}>0.00</b></div>
        <div>HDG <b ref={(e) => (hud.hdg = e)}>000</b>°</div>
        <div>VEL <b ref={(e) => (hud.spd = e)}>0.0</b></div>
      </div>
      <div className="hud__br">
        [ {String(section.i).padStart(2, '0')} / 07 ] {LABELS[section.key]}
      </div>
      <div className="hud__progress"><span ref={bar} /></div>
      <div className="hud__corners"><i /><i /><i /><i /></div>
    </div>
  )
}

/* ---------------- Word-by-word scroll-scrubbed reveal ---------------- */
export function ScrubText({ children, className = '' }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current.querySelectorAll('.w'),
        { opacity: 0.12 },
        { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 80%', end: 'bottom 45%', scrub: true } }
      )
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <p ref={ref} className={className}>
      {String(children).split(' ').map((w, i) => (
        <span className="w" key={i}>{w} </span>
      ))}
    </p>
  )
}

/* ---------------- Line slide-up heading ---------------- */
export function SplitHeading({ lines, as: Tag = 'h2', className = '', immediate = false, delay = 0 }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const targets = ref.current.querySelectorAll('.line > span')
      const from = { yPercent: 110, rotate: 3 }
      const to = { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay }
      if (!immediate) to.scrollTrigger = { trigger: ref.current, start: 'top 85%' }
      gsap.fromTo(targets, from, to)
    }, ref)
    return () => ctx.revert()
  }, [immediate, delay])
  return (
    <Tag ref={ref} className={className}>
      {lines.map((l, i) => (
        <span className="line" key={i}>
          <span>{l}</span>
        </span>
      ))}
    </Tag>
  )
}

/* ---------------- Fade-up on enter ---------------- */
export function FadeUp({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, { y: 40, opacity: 0, duration: 1, delay, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 88%' } })
    }, ref)
    return () => ctx.revert()
  }, [delay])
  return <Tag ref={ref} className={className}>{children}</Tag>
}

/* ---------------- Counter ---------------- */
export function Counter({ to, suffix = '' }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const o = { v: 0 }
    const ctx = gsap.context(() => {
      gsap.to(o, {
        v: to,
        duration: 2,
        ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%' },
        onUpdate: () => ref.current && (ref.current.textContent = Math.round(o.v) + suffix),
      })
    })
    return () => ctx.revert()
  }, [to, suffix])
  return <span ref={ref}>0{suffix}</span>
}

/* ---------------- Text scramble on hover ---------------- */
const GLYPHS = '!<>-_\\/[]{}=+*^?#01'
export function Scramble({ text }) {
  const ref = useRef()
  const run = () => {
    let f = 0
    const total = 18
    const tick = () => {
      if (!ref.current) return
      ref.current.textContent = text
        .split('')
        .map((c, i) => (c === ' ' || i < (f / total) * text.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join('')
      if (f++ < total) requestAnimationFrame(tick)
      else ref.current.textContent = text
    }
    tick()
  }
  return <span ref={ref} onMouseEnter={run}>{text}</span>
}

/* ---------------- Magnetic button ---------------- */
export function Magnetic({ children, href = '#', className = '' }) {
  const ref = useRef()
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2
    const y = e.clientY - r.top - r.height / 2
    gsap.to(ref.current, { x: x * 0.3, y: y * 0.4, duration: 0.4, ease: 'power3.out' })
  }
  const leave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
  return (
    <a ref={ref} href={href} className={className} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </a>
  )
}

export { gsap, ScrollTrigger }
