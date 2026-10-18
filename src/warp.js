// Star-system model. Tau Ceti is the origin; the ship's position is expressed by where
// Tau Ceti appears on screen (fractions of the viewport). Ship moves left => star moves right.
export const warp = { start: 0, dur: 0, tau: 400, mode: 'dir', dx: 1, dy: 0, section: 'top' }
export const nav = { pos: [0.72, 0.26], scale: 1, el: null, redraw: null, snap: false }
export const pointer = { x: 0, y: 0 }

const STAR = {
  desktop: { top: [0.72, 0.26], about: [0.86, 0.26], projects: [0.14, 0.26], skills: [0.72, 0.78], contact: [0.5, 0.27] },
  mobile: { top: [0.8, 0.2], about: [0.86, 0.2], projects: [0.14, 0.2], skills: [0.8, 0.8], contact: [0.5, 0.22] },
}
export const SECTION_SCALE = { top: 1, about: 1, projects: 1, skills: 1, contact: 2.1 }
export const DURATION = { top: 1100, about: 1100, projects: 1500, skills: 1150, contact: 2600 }

export const starFor = (id, w) => STAR[w <= 720 ? 'mobile' : 'desktop'][id]

function aim(id) {
  const w = window.innerWidth, h = window.innerHeight
  const [tx, ty] = starFor(id, w)
  let dx = (tx - nav.pos[0]) * w, dy = (ty - nav.pos[1]) * h
  const len = Math.hypot(dx, dy)
  if (len < 4) { dx = 1; dy = 0 } else { dx /= len; dy /= len }
  warp.dx = dx; warp.dy = dy
  warp.section = id
  warp.mode = id === 'contact' ? 'radial' : 'dir'
}

/** Begin a journey. Returns its duration in ms. */
export function startWarp(id) {
  aim(id)
  warp.start = performance.now()
  warp.dur = DURATION[id]
  warp.tau = warp.dur * 0.2
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

/** 0 at rest. Directional jumps peak ~40% in; the arrival run peaks early and settles slowly. */
export function warpLevel(now) {
  if (!warp.dur) return 0
  const t = (now - warp.start) / warp.dur
  if (t >= 1) { warp.dur = 0; return 0 }
  if (warp.mode === 'radial') {
    if (t < 0.22) { const u = t / 0.22; return u * u * (3 - 2 * u) }
    return Math.pow(1 - (t - 0.22) / 0.78, 1.8)
  }
  return Math.sin(Math.PI * Math.pow(Math.max(t, 0), 0.756))
}