// Canvas painters for the laptop screen, the phone and the floating UI cards.
// Everything is drawn procedurally so there are no image assets to load.

export const ACCENT = '#c6ff3d'
const MONO = '"JetBrains Mono", ui-monospace, monospace'
const SANS = '"Clash Display", "Satoshi", system-ui, sans-serif'
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3)

function rr(g, x, y, w, h, r) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/* ------------------------------------------------------------------ */
/*  1. Code editor — syntax-highlighted code typing itself             */
/* ------------------------------------------------------------------ */
const CODE = [
  "import { build, deploy } from '@cybernext/core'",
  '',
  'export default function Launch() {',
  '  const site = build({',
  "    design: 'unrecycled',",
  '    performance: 100,',
  "    seo: ['google', 'ai-search'],",
  "    ads: ['meta', 'google'],",
  '  })',
  '',
  '  return <Website {...site} converts />',
  '}',
  '',
  'deploy(site) // ✓ live in 1.2s',
]
const TOKEN = /('[^']*'|\/\/.*$|\b(?:import|export|default|function|const|return|from)\b|<\/?\w+|\d+(?:\.\d+)?|[{}()[\],.:=>/]+)/g
function colorFor(tok) {
  if (tok.startsWith("'")) return ACCENT
  if (tok.startsWith('//')) return '#6b7480'
  if (/^(import|export|default|function|const|return|from)$/.test(tok)) return '#ff7ab2'
  if (tok.startsWith('<')) return '#5fd4ff'
  if (/^\d/.test(tok)) return '#ffb86b'
  if (/^[{}()[\],.:=>/]+$/.test(tok)) return '#9aa3ad'
  return '#e6e9ee'
}

export function drawCode(g, W, H, t) {
  g.fillStyle = '#0b0e13'
  g.fillRect(0, 0, W, H)
  // title bar
  g.fillStyle = '#12161d'
  g.fillRect(0, 0, W, 46)
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    g.fillStyle = c
    g.beginPath()
    g.arc(26 + i * 22, 23, 7, 0, Math.PI * 2)
    g.fill()
  })
  g.fillStyle = '#1b2029'
  rr(g, 110, 10, 190, 36, 6)
  g.fill()
  g.font = `500 16px ${MONO}`
  g.fillStyle = '#e6e9ee'
  g.fillText('launch.jsx', 130, 34)
  g.fillStyle = '#6b7480'
  g.fillText('cybernext — ~/projects/your-brand', W - 380, 30)
  // sidebar
  g.fillStyle = '#0f1218'
  g.fillRect(0, 46, 64, H - 46)

  const total = CODE.join('\n').length
  const typed = Math.floor((t * 34) % (total + 90))
  let left = typed
  g.font = `400 22px ${MONO}`
  const lh = 36
  CODE.forEach((line, i) => {
    const y = 96 + i * lh
    g.fillStyle = '#3d4450'
    g.fillText(String(i + 1).padStart(2, ' '), 18, y)
    if (left <= 0) return
    const visible = line.slice(0, Math.max(0, left))
    left -= line.length + 1
    let x = 88
    let last = 0
    const parts = []
    visible.replace(TOKEN, (m, _p, off) => {
      if (off > last) parts.push(visible.slice(last, off))
      parts.push(m)
      last = off + m.length
      return m
    })
    if (last < visible.length) parts.push(visible.slice(last))
    parts.forEach((p) => {
      g.fillStyle = colorFor(p)
      g.fillText(p, x, y)
      x += g.measureText(p).width
    })
    // caret
    if (left <= 0 && left > -line.length - 2 && Math.sin(t * 8) > 0) {
      g.fillStyle = ACCENT
      g.fillRect(x + 2, y - 20, 11, 26)
    }
  })
  // status bar
  g.fillStyle = ACCENT
  g.fillRect(0, H - 30, W, 30)
  g.fillStyle = '#0b0e13'
  g.font = `500 15px ${MONO}`
  g.fillText('● main   ✓ build passing   Lighthouse 100', 16, H - 10)
}

/* ------------------------------------------------------------------ */
/*  2. Website being assembled block by block                           */
/* ------------------------------------------------------------------ */
export function drawSite(g, W, H, t, compact = false) {
  const p = (i) => ease((t * 1.4 - i * 0.18) / 0.5) // stagger per element
  g.fillStyle = '#f4f5f2'
  g.fillRect(0, 0, W, H)

  // browser chrome
  const top = compact ? 0 : 46
  if (!compact) {
    g.fillStyle = '#e3e5e0'
    g.fillRect(0, 0, W, 46)
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      g.fillStyle = c
      g.beginPath()
      g.arc(26 + i * 22, 23, 7, 0, Math.PI * 2)
      g.fill()
    })
    g.fillStyle = '#fff'
    rr(g, 120, 10, W - 240, 28, 14)
    g.fill()
    g.fillStyle = '#6b7066'
    g.font = `500 15px ${MONO}`
    g.fillText('🔒 yourbrand.com', 140, 29)
  }
  const s = compact ? 0.5 : 1
  const pad = 48 * s + (compact ? 14 : 0)
  const ww = W - pad * 2

  // nav
  g.globalAlpha = p(0)
  g.fillStyle = '#0b0e13'
  g.font = `700 ${compact ? 18 : 24}px ${SANS}`
  g.fillText('yourbrand', pad, top + 46 * s + 10)
  if (!compact) {
    g.fillStyle = '#b8bbb3'
    for (let i = 0; i < 4; i++) g.fillRect(W - pad - 420 + i * 80, top + 44, 54, 8)
  }
  g.fillStyle = '#0b0e13'
  rr(g, W - pad - (compact ? 60 : 110), top + 26 * s, compact ? 60 : 110, compact ? 26 : 38, 20)
  g.fill()

  // hero headline (slides up)
  const hy = top + (compact ? 120 : 150) + (1 - p(1)) * 30
  g.globalAlpha = p(1)
  g.fillStyle = '#0b0e13'
  g.font = `600 ${compact ? 40 : 66}px ${SANS}`
  g.fillText('Grow faster.', pad, hy)
  g.globalAlpha = p(2)
  g.fillStyle = '#0b0e13'
  g.fillText('Look sharper.', pad, hy + (compact ? 44 : 70))
  g.globalAlpha = p(3)
  g.fillStyle = '#8c9087'
  g.fillRect(pad, hy + (compact ? 70 : 110), ww * (compact ? 0.8 : 0.36), 10 * (compact ? 0.8 : 1))
  g.fillRect(pad, hy + (compact ? 86 : 132), ww * (compact ? 0.6 : 0.28), 10 * (compact ? 0.8 : 1))
  g.globalAlpha = p(4)
  g.fillStyle = '#0b0e13'
  rr(g, pad, hy + (compact ? 106 : 166), compact ? 120 : 170, compact ? 36 : 50, 26)
  g.fill()
  g.fillStyle = ACCENT
  g.font = `600 ${compact ? 14 : 18}px ${SANS}`
  g.fillText('Get started →', pad + (compact ? 14 : 22), hy + (compact ? 129 : 197))

  // hero visual
  if (!compact) {
    g.globalAlpha = p(3)
    const gx = W * 0.56
    const gy = top + 80
    const grad = g.createLinearGradient(gx, gy, gx + 380, gy + 300)
    grad.addColorStop(0, ACCENT)
    grad.addColorStop(1, '#5fd4ff')
    g.fillStyle = grad
    rr(g, gx, gy, W - gx - pad, 290, 22)
    g.fill()
    g.fillStyle = 'rgba(11,14,19,.85)'
    rr(g, gx + 30, gy + 190, 200, 70, 14)
    g.fill()
    g.fillStyle = '#fff'
    g.font = `600 28px ${SANS}`
    g.fillText('+248%', gx + 48, gy + 236)
  }

  // feature cards
  const cy = compact ? hy + 170 : top + 410
  const n = compact ? 2 : 3
  const cw = (ww - (n - 1) * 20) / n
  for (let i = 0; i < n; i++) {
    g.globalAlpha = p(5 + i)
    g.fillStyle = '#fff'
    rr(g, pad + i * (cw + 20), cy + (1 - p(5 + i)) * 20, cw, compact ? 120 : 150, 16)
    g.fill()
    g.fillStyle = i === 0 ? ACCENT : '#0b0e13'
    g.beginPath()
    g.arc(pad + i * (cw + 20) + 34, cy + 38, 14, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#c8cbc3'
    g.fillRect(pad + i * (cw + 20) + 20, cy + 80, cw * 0.6, 9)
    g.fillRect(pad + i * (cw + 20) + 20, cy + 100, cw * 0.4, 9)
  }
  g.globalAlpha = 1

  // animated cursor
  if (!compact) {
    const k = (t * 0.4) % 1
    const cx = pad + 60 + Math.sin(k * Math.PI * 2) * 160 + 200
    const cyy = top + 330 + Math.cos(k * Math.PI * 2) * 60
    g.fillStyle = '#0b0e13'
    g.beginPath()
    g.moveTo(cx, cyy)
    g.lineTo(cx + 16, cyy + 38)
    g.lineTo(cx + 22, cyy + 22)
    g.lineTo(cx + 38, cyy + 16)
    g.closePath()
    g.fill()
  }
}

/* ------------------------------------------------------------------ */
/*  3. Analytics dashboard — marketing results                          */
/* ------------------------------------------------------------------ */
const SERIES = Array.from({ length: 32 }, (_, i) => 0.12 + Math.pow(i / 31, 1.7) * 0.78 + Math.sin(i * 1.7) * 0.035)
export function drawChart(g, W, H, t) {
  g.fillStyle = '#0b0e13'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#6b7480'
  g.font = `500 16px ${MONO}`
  g.fillText('ANALYTICS · LAST 90 DAYS', 40, 50)
  g.fillStyle = '#e6e9ee'
  g.font = `600 30px ${SANS}`
  g.fillText('Organic traffic', 40, 96)
  g.fillStyle = ACCENT
  g.font = `600 64px ${SANS}`
  const pct = Math.round(248 * ease(t / 2))
  g.fillText(`+${pct}%`, 40, 170)

  // line chart
  const x0 = 40, y0 = 210, cw = W * 0.6, ch = H - 280
  g.strokeStyle = '#1d232c'
  g.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    g.beginPath()
    g.moveTo(x0, y0 + (ch / 4) * i)
    g.lineTo(x0 + cw, y0 + (ch / 4) * i)
    g.stroke()
  }
  const prog = ease(t / 2.2)
  const n = Math.max(2, Math.floor(SERIES.length * prog))
  const pt = (i) => [x0 + (i / (SERIES.length - 1)) * cw, y0 + ch - SERIES[i] * ch]
  const grad = g.createLinearGradient(0, y0, 0, y0 + ch)
  grad.addColorStop(0, 'rgba(198,255,61,0.35)')
  grad.addColorStop(1, 'rgba(198,255,61,0)')
  g.beginPath()
  g.moveTo(...pt(0))
  for (let i = 1; i < n; i++) g.lineTo(...pt(i))
  g.lineTo(pt(n - 1)[0], y0 + ch)
  g.lineTo(x0, y0 + ch)
  g.closePath()
  g.fillStyle = grad
  g.fill()
  g.beginPath()
  g.moveTo(...pt(0))
  for (let i = 1; i < n; i++) g.lineTo(...pt(i))
  g.strokeStyle = ACCENT
  g.lineWidth = 4
  g.stroke()
  const [ex, ey] = pt(n - 1)
  g.fillStyle = ACCENT
  g.beginPath()
  g.arc(ex, ey, 8, 0, Math.PI * 2)
  g.fill()

  // KPI tiles
  const kx = x0 + cw + 40
  const kw = W - kx - 40
  const KPIS = [
    ['Conversions', '3,412', '+61%'],
    ['Ad CTR', '7.4%', '+2.1'],
    ['Google rank', '#1', '↑ 14'],
  ]
  KPIS.forEach(([label, val, d], i) => {
    const a = ease(t * 1.5 - i * 0.3)
    g.globalAlpha = a
    const ky = 60 + i * 150
    g.fillStyle = '#12161d'
    rr(g, kx, ky, kw, 130, 14)
    g.fill()
    g.fillStyle = '#6b7480'
    g.font = `500 15px ${MONO}`
    g.fillText(label.toUpperCase(), kx + 22, ky + 34)
    g.fillStyle = '#fff'
    g.font = `600 44px ${SANS}`
    g.fillText(val, kx + 22, ky + 92)
    g.fillStyle = ACCENT
    g.font = `500 18px ${MONO}`
    g.fillText(d, kx + kw - 80, ky + 92)
  })
  g.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/*  Floating UI cards (drawn once)                                       */
/* ------------------------------------------------------------------ */
function card(g, W, H) {
  g.clearRect(0, 0, W, H)
  g.fillStyle = 'rgba(14,17,22,0.88)'
  rr(g, 4, 4, W - 8, H - 8, 28)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.14)'
  g.lineWidth = 3
  g.stroke()
}

export const CARDS = {
  code(g, W, H) {
    card(g, W, H)
    g.fillStyle = ACCENT
    g.font = `600 120px ${MONO}`
    g.textAlign = 'center'
    g.fillText('</>', W / 2, H / 2 + 30)
    g.fillStyle = '#9aa3ad'
    g.font = `500 22px ${MONO}`
    g.fillText('CLEAN CODE', W / 2, H - 34)
    g.textAlign = 'left'
  },
  seo(g, W, H) {
    card(g, W, H)
    g.fillStyle = '#fff'
    rr(g, 30, 40, W - 60, 64, 32)
    g.fill()
    g.fillStyle = '#0b0e13'
    g.font = `500 26px ${SANS}`
    g.fillText('⌕  web design agency', 56, 82)
    g.fillStyle = ACCENT
    g.font = `600 64px ${SANS}`
    g.fillText('#1', 36, 192)
    g.fillStyle = '#9aa3ad'
    g.font = `500 22px ${MONO}`
    g.fillText('ON GOOGLE + AI SEARCH', 120, 180)
  },
  speed(g, W, H) {
    card(g, W, H)
    const cx = W / 2, cy = H / 2 - 10, r = 74
    g.lineWidth = 14
    g.strokeStyle = '#1d232c'
    g.beginPath()
    g.arc(cx, cy, r, 0, Math.PI * 2)
    g.stroke()
    g.strokeStyle = ACCENT
    g.beginPath()
    g.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5)
    g.stroke()
    g.fillStyle = '#fff'
    g.font = `600 64px ${SANS}`
    g.textAlign = 'center'
    g.fillText('100', cx, cy + 22)
    g.fillStyle = '#9aa3ad'
    g.font = `500 20px ${MONO}`
    g.fillText('PERFORMANCE', cx, H - 26)
    g.textAlign = 'left'
  },
  ads(g, W, H) {
    card(g, W, H)
    g.fillStyle = '#9aa3ad'
    g.font = `500 22px ${MONO}`
    g.fillText('PAID MEDIA · ROAS', 36, 60)
    g.fillStyle = '#fff'
    g.font = `600 78px ${SANS}`
    g.fillText('4.8×', 36, 150)
    const bars = [0.3, 0.45, 0.4, 0.6, 0.72, 0.9]
    bars.forEach((b, i) => {
      g.fillStyle = i === bars.length - 1 ? ACCENT : '#2a313b'
      g.fillRect(W - 230 + i * 34, 190 - b * 140, 22, b * 140)
    })
  },
  growth(g, W, H) {
    card(g, W, H)
    g.fillStyle = '#9aa3ad'
    g.font = `500 22px ${MONO}`
    g.fillText('LEADS / MONTH', 36, 60)
    g.strokeStyle = ACCENT
    g.lineWidth = 6
    g.beginPath()
    const pts = [0.15, 0.2, 0.18, 0.35, 0.33, 0.5, 0.62, 0.85]
    pts.forEach((v, i) => {
      const x = 36 + (i / (pts.length - 1)) * (W - 72)
      const y = H - 40 - v * (H - 120)
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    })
    g.stroke()
  },
}
