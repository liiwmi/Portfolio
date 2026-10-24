// Star-system model. Tau Ceti is the origin; the ship's position is expressed by where
// Tau Ceti appears on screen (fractions of the viewport). Ship moves left => star moves right.
export const warp = {
  start: 0, dur: 0, tau: 400, stau: 600, t: 0, section: 'top',
  bx: 1, by: 0,         // unit bearing: direction stars flow along the straight route
  tx: 0, ty: 0,         // lean vector added to the bearing
  align: 0.6,           // how much of the lean is shed by the end of the jump
  ux: 1, uy: 0,         // launch heading (also published to CSS)
}
export const nav = { pos: [0.72, 0.26], scale: 1, el: null, redraw: null, snap: false }
export const pointer = { x: 0, y: 0 }

const STAR = {
  desktop: { top: [0.72, 0.26], about: [0.86, 0.26], projects: [0.14, 0.26], skills: [0.72, 0.78], contact: [0.5, 0.27] },
  mobile: { top: [0.8, 0.2], about: [0.86, 0.2], projects: [0.14, 0.2], skills: [0.8, 0.8], contact: [0.5, 0.22] },
}
export const SECTION_SCALE = { top: 1, about: 1, projects: 1, skills: 1, contact: 2.1 }
export const DURATION = { top: 1100, about: 1100, projects: 1500, skills: 1150, contact: 3000 }
// When the section swaps, and when navigation unlocks, as fractions of the duration.
// Contact swaps late (after the stars have nearly stopped) and unlocks once they have.
export const SWAP = { top: 0.42, about: 0.42, projects: 0.42, skills: 0.42, contact: 0.6 }
export const END = { top: 1, about: 1, projects: 1, skills: 1, contact: 0.88 }

// Screen-space lean for how the STARS drift (the ship moves the opposite way).
export const TRAJ = {
  top:      { tilt: [0.12, -0.36], align: 0.6 },
  about:    { tilt: [0.0, 0.46], align: 0.55 },
  projects: { tilt: [0.0, -0.3], align: 0.5 },
  skills:   { tilt: [-0.55, 0.0], align: 0.62 },
  contact:  { tilt: [0.5, 0.3], align: 1 },
}

export const starFor = (id, w) => STAR[w <= 720 ? 'mobile' : 'desktop'][id]

/** Unit heading of the star flow. s = 0 at launch, 1 at arrival (the lean fades with s). */
export function heading(s) {
  const k = 1 - warp.align * s
  const x = warp.bx + warp.tx * k, y = warp.by + warp.ty * k
  const l = Math.hypot(x, y)
  return l < 0.001 ? [warp.bx, warp.by] : [x / l, y / l]
}

function aim(id) {
  const w = window.innerWidth, h = window.innerHeight
  const [tx, ty] = starFor(id, w)
  let dx = (tx - nav.pos[0]) * w, dy = (ty - nav.pos[1]) * h
  const len = Math.hypot(dx, dy)
  if (len < 4) { dx = 1; dy = 0 } else { dx /= len; dy /= len }
  const traj = TRAJ[id]
  warp.bx = dx; warp.by = dy
  warp.tx = traj.tilt[0]; warp.ty = traj.tilt[1]
  warp.align = traj.align
  warp.section = id
  // Contact glides in more gently: slower position follow, even slower growth.
  const arriving = id === 'contact'
  warp.tau = DURATION[id] * (arriving ? 0.3 : 0.2)
  warp.stau = DURATION[id] * (arriving ? 0.4 : 0.2)
  const [ux, uy] = heading(0)
  warp.ux = ux; warp.uy = uy
  const root = document.documentElement.style
  root.setProperty('--wdx', ux.toFixed(3))
  root.setProperty('--wdy', uy.toFixed(3))
}

/** Begin a journey. Returns its duration in ms. */
export function startWarp(id) {
  aim(id)
  warp.start = performance.now()
  warp.dur = DURATION[id]
  warp.t = 0
  return warp.dur
}

/** Change destination mid-flight without restarting the animation. */
export function retarget(id) { aim(id) }

/** Jump without animation (first load, reduced motion). */
export function setTarget(id) {
  warp.section = id
  nav.snap = true
  nav.redraw?.()
}

const smooth01 = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x) }

/** 0 at rest. Directional jumps peak ~40% in. The arrival run is lower and calmer:
 *  a short smooth ramp, then a long cosine glide to a stop (no kink at the peak).
 *  Also records journey progress in warp.t (0..1). */
export function warpLevel(now) {
  if (!warp.dur) { warp.t = 0; return 0 }
  const t = (now - warp.start) / warp.dur
  if (t >= 1) { warp.dur = 0; warp.t = 0; return 0 }
  warp.t = Math.max(t, 0)
  if (warp.section === 'contact') {
    if (t < 0.2) return 0.75 * smooth01(t / 0.2)
    const u = (t - 0.2) / 0.8
    return 0.75 * Math.pow(0.5 * (1 + Math.cos(Math.PI * u)), 1.4)
  }
  return Math.sin(Math.PI * Math.pow(Math.max(t, 0), 0.756))
}