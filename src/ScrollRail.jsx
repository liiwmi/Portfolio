import { useEffect, useRef } from "react";

export default function ScrollRail({ items, index, onGo }) {
  const thumb = useRef(null);

  useEffect(() => {
    const el = document.getElementById(`screen-${items[index][0]}`);
    const t = thumb.current;
    if (!el || !t) return;
    const update = () => {
      const range = el.scrollHeight - el.clientHeight;
      if (range <= 2) {
        t.style.opacity = 0;
        return;
      }
      const track = t.parentElement.clientHeight;
      const size = Math.max(24, (el.clientHeight / el.scrollHeight) * track);
      t.style.opacity = 1;
      t.style.height = `${size}px`;
      t.style.transform = `translateY(${(el.scrollTop / range) * (track - size)}px)`;
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const c of el.children) ro.observe(c);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items, index]);

  return (
    <>
      <nav className="rail" aria-label="Sections">
        <ol>
          {items.map(([id, label], i) => (
            <li key={id}>
              <button
                type="button"
                className="tick"
                aria-label={`Travel to ${label}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => onGo(id)}
              >
                <span className="tick-label mono">
                  {String(i).padStart(2, "0")}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="track" aria-hidden="true">
        <i ref={thumb} />
      </div>
    </>
  );
}
