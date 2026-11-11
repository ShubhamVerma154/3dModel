// Shared, mutable state read every frame by the 3D scene.
// Kept outside React so scroll / mouse updates never trigger re-renders.
export const state = {
  scrollY: 0,
  velocity: 0,      // lenis scroll velocity
  mouse: { x: 0, y: 0 }, // normalised -1..1
  ready: false,     // preloader finished -> drone flies in
  beam: 0,          // current scan-beam intensity (written by the drone rig)
  dronePos: { x: 0, y: 0, z: 0 },
}

// HUD elements the scene writes into directly (no React renders per frame)
export const hud = {}

// Model poses per section. Each section in the page has data-drone="<key>".
// pos: [x, y, z]   rot: [pitch, yaw, roll] (radians)   s: scale
// beam: ground-grid glow 0..1   open: laptop lid 0..1   spread: floating UI cards 0..1.4
// screen: what the laptop shows — 'code' | 'site' | 'chart'
// Yaw values step by full turns (2π ≈ 6.28) so it spins between sections but faces you at rest.
export const KEYFRAMES = {
  hero:     { pos: [1.35, 0.1, -0.4],  rot: [0.32, -0.45, 0.04], s: 0.8,   beam: 0,   open: 1,    spread: 1,    screen: 'code' },
  about:    { pos: [2.1, -0.05, 0],    rot: [0.4, -0.65, -0.06], s: 0.72, beam: 0,   open: 1,    spread: 0.75, screen: 'code' },
  services: { pos: [-2.15, -0.05, 0],  rot: [0.3, 6.85, 0.06],   s: 0.7,  beam: 0,   open: 1,    spread: 0.75, screen: 'site' },
  scan:     { pos: [0, 0.05, -0.6],    rot: [0.42, 6.28, 0],     s: 0.68, beam: 1,   open: 1,    spread: 1.35, screen: 'site' },
  stats:    { pos: [2.05, -0.1, 0.3],  rot: [0.3, 5.75, -0.05],  s: 0.74, beam: 0,   open: 1,    spread: 0.7,  screen: 'chart' },
  work:     { pos: [-2.05, 0.0, 0],    rot: [0.35, 13.1, 0.05],  s: 0.7,  beam: 0,   open: 0.9,  spread: 0.75, screen: 'site' },
  contact:  { pos: [1.6, 0.35, 0.9],   rot: [0.3, 12.1, 0.04],   s: 0.8,  beam: 0.35, open: 1,   spread: 1.05, screen: 'code' },
}
