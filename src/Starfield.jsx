import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from './hooks.js'
import { warp, warpLevel, pointer, nav, starFor, heading, SECTION_SCALE } from './warp.js'

const COUNT = 240
const SPEED = 0.0075 // viewport heights per ms at full warp, nearest stars
const COOL = '#92a8c2' // muted blue-gray streaks
const WARM = '#c9b99f' // soft warm silver, for a few stars
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x) }

/**
 * Stars live in screen space. During a warp each star moves away from a vanishing point
 * ahead of the ship (so streaks fan out in perspective). For the Contact jump that point
 * slides onto Tau Ceti, turning the diagonal drift into a slow radial settle.
 */
export default function Starfield() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduced = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const stars = Array.from({ length: COUNT }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.95 + 0.05, warm: Math.random() < 0.15,
    }))
    let w = 0, h = 0, raf = 0, last = 0
    let cux = 1, cuy = 0, lx = 0, ly = 0 // eased heading and lean

    // New stars appear dim and distant so nothing pops in near Tau Ceti.
    const respawn = (s, sx, sy) => {
      const a = Math.random() * Math.PI * 2, r = 0.03 + Math.random() * 0.12
      s.x = sx + Math.cos(a) * r * (h / w)
      s.y = sy + Math.sin(a) * r
      s.z = 0.6 + Math.random() * 0.4
    }

    const draw = (now) => {
      const level = reduced ? 0 : warpLevel(now)
      const dtRaw = now - last
      if (!reduced && level === 0 && last && dtRaw < 32) { raf = requestAnimationFrame(draw); return }
      const dt = Math.min(dtRaw || 16, 50)
      last = now

      // Tau Ceti glides toward the destination section's position and scale.
      const [tx, ty] = starFor(warp.section, w)
      const tsc = SECTION_SCALE[warp.section]
      if (reduced || nav.snap) {
        nav.pos[0] = tx; nav.pos[1] = ty; nav.scale = tsc; nav.snap = false
      } else {
        const kp = 1 - Math.exp(-dt / Math.max(warp.tau, 200))
        const ks = 1 - Math.exp(-dt / Math.max(warp.stau, 200))
        nav.pos[0] += (tx - nav.pos[0]) * kp
        nav.pos[1] += (ty - nav.pos[1]) * kp
        nav.scale += (tsc - nav.scale) * ks
      }

      // Heading eases toward its target so a mid-flight retarget never jumps.
      const [hx, hy] = heading(smooth(warp.t))
      if (level === 0) { cux = hx; cuy = hy; lx = warp.tx; ly = warp.ty }
      else {
        const k = 1 - Math.exp(-dt / 140)
        cux += (hx - cux) * k; cuy += (hy - cuy) * k
        lx += (warp.tx - lx) * k; ly += (warp.ty - ly) * k
        const l = Math.hypot(cux, cuy) || 1
        cux /= l; cuy /= l
      }
      // 0 for ordinary jumps; for Contact, how far the flow has turned radial (gradual).
      const arriving = warp.section === 'contact'
      const m = arriving ? smooth((warp.t - 0.12) / 0.55) : 0

      // Tau Ceti is distant, so it bows only slightly along the lean (zero at both ends).
      const sx = nav.pos[0], sy = nav.pos[1]
      const bow = 0.09 * level * (1 - m)
      const cx = (sx + lx * bow) * w - pointer.x * 10
      const cy = (sy + ly * bow) * h - pointer.y * 8
      const g = nav.scale

      if (nav.el) {
        nav.el.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`
        nav.el.style.setProperty('--s', g.toFixed(3))
      }

      ctx.clearRect(0, 0, w, h)

      // Tau Ceti: a restrained warm halo, faint rings, small core
      const R = 90 * (1 + (g - 1) * 0.55)
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
      halo.addColorStop(0, 'rgba(255,232,196,0.42)')
      halo.addColorStop(0.1, 'rgba(255,208,148,0.15)')
      halo.addColorStop(1, 'rgba(255,200,120,0)')
      ctx.fillStyle = halo
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      ctx.strokeStyle = 'rgba(150,175,200,0.07)'
      ctx.lineWidth = 1
      for (const r of [160, 280, 420]) { ctx.beginPath(); ctx.arc(cx, cy, r * g, 0, Math.PI * 2); ctx.stroke() }
      ctx.fillStyle = '#f3e4c8'
      ctx.beginPath(); ctx.arc(cx, cy, 2.4 * g, 0, Math.PI * 2); ctx.fill()

      // Vanishing point: far ahead of the ship, sliding onto Tau Ceti for the arrival.
      const far = Math.max(w, h)
      const dist = far * 2.2
      const Fx = (w / 2 - cux * dist) * (1 - m) + cx * m
      const Fy = (h / 2 - cuy * dist) * (1 - m) + cy * m
      const idleScale = arriving ? 0.35 : 1 // the Contact scene is calmer at rest

      ctx.lineCap = 'round'
      for (const s of stars) {
        const near = 1 - s.z
        let dx = 0, dy = 0

        if (level > 0.001) {
          const px0 = s.x * w, py0 = s.y * h
          dx = px0 - Fx; dy = py0 - Fy
          const dl = Math.hypot(dx, dy) || 1
          dx /= dl; dy /= dl
          // Arrival: a gentle outward flow, slightly faster toward the edges.
          const rl = Math.hypot(px0 - cx, py0 - cy) / far
          const mul = 1 + (0.5 + rl * 0.8 - 1) * m
          const sp = level * dt * SPEED * (0.3 + near * 0.9) * mul
          s.x += (dx * sp * h) / w
          s.y += dy * sp
          if (m < 0.5) { s.x -= Math.floor(s.x); s.y -= Math.floor(s.y) }
        } else {
          const d = dt * 0.00003 * (0.3 + near) * idleScale
          s.x += (s.x - sx) * d
          s.y += (s.y - sy) * d
        }
        if (m >= 0.5 || level === 0) {
          if (s.x < -0.05 || s.x > 1.05 || s.y < -0.05 || s.y > 1.05) respawn(s, sx, sy)
        }

        const px = s.x * w - pointer.x * 14 * near
        const py = s.y * h - pointer.y * 14 * near
        const col = s.warm ? WARM : COOL

        if (level < 0.03) {
          ctx.globalAlpha = Math.min(0.9, near * 1.1 + 0.15)
          ctx.fillStyle = s.warm ? '#d8ccb6' : '#c3d0de'
          const sz = 1 + near * 0.9
          ctx.fillRect(px, py, sz, sz)
        } else {
          const a = (0.1 + near * 0.8) * 0.75
          const len = level * (24 + near * 150)
          const lw = 0.5 + near * 1.0
          ctx.strokeStyle = col
          ctx.beginPath()
          ctx.moveTo(px - dx * len, py - dy * len)
          ctx.lineTo(px, py)
          if (near > 0.6) { // faint motion blur on the nearest stars only
            ctx.globalAlpha = a * 0.1
            ctx.lineWidth = lw * 2.6
            ctx.stroke()
          }
          ctx.globalAlpha = a
          ctx.lineWidth = lw
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduced) draw(performance.now())
    }

    nav.redraw = () => { if (reduced) draw(performance.now()) }
    resize()
    if (!reduced) raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      nav.redraw = null
    }
  }, [])

  return <canvas ref={ref} className="starfield" aria-hidden="true" />
}