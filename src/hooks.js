import { useEffect, useState } from 'react'
import { pointer } from './warp.js'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const GLYPHS = '01#%&*+=<>/\\|ABCDEFHKMNRSTXZ'
const rnd = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

/**
 * Scrambles text and resolves it left to right in ~1.1s.
 * Writes straight to the DOM node: zero React renders while animating.
 */
export function useScramble(ref, final, active, onDone, duration = 1100) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    if (prefersReducedMotion()) { el.textContent = final; onDone(); return }
    const n = final.length
    let raf, start, lastShuffle = -Infinity
    const tick = (now) => {
      start ??= now
      const t = Math.min((now - start) / duration, 1)
      if (t === 1) { el.textContent = final; onDone(); return }
      if (now - lastShuffle >= 40) {
        lastShuffle = now
        let out = ''
        for (let i = 0; i < n; i++) {
          const c = final[i]
          out += c === ' ' || t >= (i / (n - 1)) * 0.88 ? c : rnd()
        }
        el.textContent = out
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, final, active, onDone, duration])
}

/** Eased tilt toward the cursor. Writes CSS variables, so React never re-renders. */
export function useGyro(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return
    const root = document.documentElement
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
    let raf = 0
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.06
      cur.y += (target.y - cur.y) * 0.06
      pointer.x = cur.x
      pointer.y = cur.y
      el.style.setProperty('--rx', `${(-cur.y * 1.4).toFixed(3)}deg`)
      el.style.setProperty('--ry', `${(cur.x * 1.8).toFixed(3)}deg`)
      root.style.setProperty('--px', cur.x.toFixed(3))
      root.style.setProperty('--py', cur.y.toFixed(3))
      const settled = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) < 0.0005
      raf = settled ? 0 : requestAnimationFrame(loop)
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop) }
    const move = (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1
      target.y = (e.clientY / window.innerHeight) * 2 - 1
      kick()
    }
    const leave = () => { target.x = 0; target.y = 0; kick() }
    window.addEventListener('pointermove', move, { passive: true })
    root.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
      cancelAnimationFrame(raf)
    }
  }, [ref])
}

export function useUptime() {
  const [s, setS] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setS((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

export function useRotating(list, ms = 7000) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % list.length), ms)
    return () => clearInterval(id)
  }, [list, ms])
  return list[i]
}

/**
 * Real initialization: waits for fonts and the window load event.
 * The loader only appears if that takes longer than 150 ms, stays at least
 * 900 ms once shown (no flash), and never blocks longer than 3 s.
 */
export function useBoot() {
  const [s, set] = useState({ stage: 0, show: false, ready: false })
  useEffect(() => {
    let alive = true, done = false, shownAt = 0
    const timers = []
    const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms))
    const bump = (n) => alive && set((p) => ({ ...p, stage: Math.max(p.stage, n) }))

    const finish = () => {
      if (done) return
      done = true
      const wait = shownAt ? Math.max(0, 900 - (performance.now() - shownAt)) : 0
      later(() => set((p) => ({ ...p, stage: 3, ready: true })), wait)
    }

    later(() => {
      if (!done) { shownAt = performance.now(); set((p) => ({ ...p, show: true })) }
    }, 150)

    const fonts = Promise.all([
      document.fonts?.load('300 16px Inter'),
      document.fonts?.load('400 12px "JetBrains Mono"'),
    ]).catch(() => {}).then(() => bump(1))
    const loaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((r) => window.addEventListener('load', r, { once: true }))
    loaded.then(() => bump(2))
    Promise.all([fonts, loaded]).then(finish)
    later(finish, 3000)

    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [])
  return s
}