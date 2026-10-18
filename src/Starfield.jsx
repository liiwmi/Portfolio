import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./hooks.js";
import {
  warp,
  warpLevel,
  pointer,
  nav,
  starFor,
  SECTION_SCALE,
} from "./warp.js";

const COUNT = 280;
const SPEED = 0.0075; // viewport heights per ms at full warp, nearest stars

/** Stars live in screen space. Warps push them along the travel vector (or outward from Tau Ceti). */
export default function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stars = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.95 + 0.05,
    }));
    let w = 0,
      h = 0,
      raf = 0,
      last = 0;

    const respawn = (s, sx, sy) => {
      const a = Math.random() * Math.PI * 2,
        r = 0.02 + Math.random() * 0.1;
      s.x = sx + Math.cos(a) * r * (h / w);
      s.y = sy + Math.sin(a) * r;
    };

    const draw = (now) => {
      const level = reduced ? 0 : warpLevel(now);
      const dtRaw = now - last;
      if (!reduced && level === 0 && last && dtRaw < 32) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(dtRaw || 16, 50);
      last = now;

      // Tau Ceti glides toward the destination section's position and scale.
      const [tx, ty] = starFor(warp.section, w);
      const tsc = SECTION_SCALE[warp.section];
      if (reduced || nav.snap) {
        nav.pos[0] = tx;
        nav.pos[1] = ty;
        nav.scale = tsc;
        nav.snap = false;
      } else {
        const k = 1 - Math.exp(-dt / Math.max(warp.tau, 200));
        nav.pos[0] += (tx - nav.pos[0]) * k;
        nav.pos[1] += (ty - nav.pos[1]) * k;
        nav.scale += (tsc - nav.scale) * k;
      }
      const sx = nav.pos[0],
        sy = nav.pos[1];
      const cx = sx * w - pointer.x * 10,
        cy = sy * h - pointer.y * 8;
      const g = nav.scale * (1 + level * 0.3);

      if (nav.el) {
        nav.el.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
        nav.el.style.setProperty("--s", g.toFixed(3));
      }

      ctx.clearRect(0, 0, w, h);

      // Tau Ceti: halo, rings, core
      const R = 90 * g;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      halo.addColorStop(0, "rgba(255,238,205,0.6)");
      halo.addColorStop(0.08, "rgba(255,214,150,0.22)");
      halo.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.strokeStyle = "rgba(150,175,200,0.07)";
      ctx.lineWidth = 1;
      for (const r of [160, 280, 420]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * g, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff4de";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4 * g, 0, Math.PI * 2);
      ctx.fill();

      // Stars
      const radial = warp.mode === "radial";
      const far = Math.max(w, h);
      ctx.strokeStyle = "#cfe0f5";
      ctx.fillStyle = "#d6e2f0";
      ctx.lineCap = "round";
      for (const s of stars) {
        const near = 1 - s.z;
        const rx = (s.x - sx) * w,
          ry = (s.y - sy) * h;
        const rl = Math.hypot(rx, ry) || 1;
        let ux = warp.dx,
          uy = warp.dy;
        if (radial) {
          ux = rx / rl;
          uy = ry / rl;
        }

        if (level > 0.001) {
          const sp =
            level *
            dt *
            SPEED *
            (0.3 + near * 0.9) *
            (radial ? 0.4 + (rl / far) * 1.6 : 1);
          s.x += (ux * sp * h) / w;
          s.y += uy * sp;
          if (!radial) {
            s.x -= Math.floor(s.x);
            s.y -= Math.floor(s.y);
          }
        } else {
          const d = dt * 0.00003 * (0.3 + near);
          s.x += (s.x - sx) * d;
          s.y += (s.y - sy) * d;
        }
        if (radial || level === 0) {
          if (s.x < -0.05 || s.x > 1.05 || s.y < -0.05 || s.y > 1.05)
            respawn(s, sx, sy);
        }

        const px = s.x * w - pointer.x * 14 * near;
        const py = s.y * h - pointer.y * 14 * near;
        ctx.globalAlpha = Math.min(1, near * 1.2 + 0.15);
        if (level < 0.03) {
          const sz = 1 + near * 0.9;
          ctx.fillRect(px, py, sz, sz);
        } else {
          const len = level * (30 + near * 210);
          ctx.lineWidth = 0.6 + near * 1.4;
          ctx.beginPath();
          ctx.moveTo(px - ux * len, py - uy * len);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (level > 0.02) {
        const bloom = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          far * (radial ? 0.7 : 0.5),
        );
        bloom.addColorStop(0, `rgba(190,210,240,${(0.14 * level).toFixed(3)})`);
        bloom.addColorStop(1, "rgba(190,210,240,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, w, h);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(performance.now());
    };

    nav.redraw = () => {
      if (reduced) draw(performance.now());
    };
    resize();
    if (!reduced) raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      nav.redraw = null;
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
