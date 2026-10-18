import { useEffect, useRef } from "react";
import { nav } from "./warp.js";

const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [(r * Math.cos(a)).toFixed(2), (r * Math.sin(a)).toFixed(2)];
};
const arc = (r, a0, a1) => {
  const [x0, y0] = pt(r, a0),
    [x1, y1] = pt(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
};
const tick = (r0, r1, deg) => {
  const [x0, y0] = pt(r0, deg),
    [x1, y1] = pt(r1, deg);
  return `M${x0} ${y0} L${x1} ${y1}`;
};

// 120-degree targeting arc over the top of the star, capped with end ticks.
const ARC = arc(54, -150, -30);
const CAPS = tick(48, 60, -150) + tick(48, 60, -30);
const CROSS = [0, 90, 180, 270].map((d) => tick(14, 24, d)).join("");

const COORDS = "RA 01h 44m 04s  DEC −15° 56′ 15″";
const INFO = {
  top: {
    title: "DESTINATION: TAU CETI",
    lines: ["HD 10700 / G8 V", COORDS, "RANGE 11.90 LY"],
    status: "TRAJECTORY LOCKED",
  },
  about: {
    title: "TAU CETI / BEARING EAST",
    lines: ["SECTOR: WEST OF TARGET", COORDS, "RANGE 8.40 LY"],
    status: "HOLDING PORT SIDE",
  },
  projects: {
    title: "TAU CETI / BEARING WEST",
    lines: ["SECTOR: FAR EAST OF TARGET", COORDS, "RANGE 9.70 LY"],
    status: "HOLDING STARBOARD SIDE",
  },
  skills: {
    title: "TAU CETI / BEARING SOUTH",
    lines: ["SECTOR: NORTH OF TARGET", COORDS, "RANGE 6.10 LY"],
    status: "HOLDING HIGH ORBIT",
  },
  contact: {
    title: "DESTINATION REACHED: TAU CETI",
    lines: ["HD 10700 / G8 V", "RANGE 0.00 LY"],
    status: "STATUS: ARRIVED / MISSION COMPLETE",
  },
};

export default function TauMarker({ section, traveling, ready }) {
  const ref = useRef(null);
  useEffect(() => {
    nav.el = ref.current;
    return () => {
      nav.el = null;
    };
  }, []);

  const info = INFO[section];
  const arrived = section === "contact" && !traveling;
  const status = traveling
    ? section === "contact"
      ? "FINAL APPROACH"
      : "IN TRANSIT"
    : info.status;

  return (
    <aside
      ref={ref}
      className="tau"
      data-ready={ready}
      data-arrived={arrived}
      data-above={section === "skills"}
      aria-label="Navigation target: Tau Ceti"
    >
      <svg className="tau-reticle" viewBox="-80 -80 160 160" aria-hidden="true">
        <circle className="tau-ring" r="70" />
        <circle className="tau-lock" r="54" />
        <path className="tau-arc" d={ARC} />
        <path className="tau-arc" d={CAPS} />
        <path className="tau-cross" d={CROSS} />
      </svg>
      <div className="tau-label" aria-live="polite">
        <p className="tau-title">
          {traveling && section !== "contact"
            ? "DESTINATION: TAU CETI"
            : info.title}
        </p>
        {!traveling &&
          info.lines.map((l, i) => (
            <p key={l} className={l === COORDS ? "tau-coords" : undefined}>
              {l}
            </p>
          ))}
        <p className={arrived ? "tau-title" : undefined}>{status}</p>
      </div>
    </aside>
  );
}
