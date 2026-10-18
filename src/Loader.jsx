const STAGES = [
  "INITIALIZING NAVIGATION SYSTEM...",
  "CALIBRATING STAR TRACKER...",
  "ESTABLISHING CONNECTION...",
  "SYSTEM READY",
];

export default function Loader({ stage, leaving }) {
  return (
    <div
      className="loader"
      data-leaving={leaving}
      role="status"
      aria-live="polite"
    >
      <svg className="reticle" viewBox="-30 -30 60 60" aria-hidden="true">
        <path d="M-30 0H-14M14 0H30M0 -30V-14M0 14V30" />
        <circle className="r-ring" r="22" />
        <path className="r-arc" d="M0 -22 A22 22 0 0 1 19 11" />
      </svg>
      <p className="mono">{STAGES[stage]}</p>
      <div className="bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${(stage + 1) / STAGES.length})` }} />
      </div>
    </div>
  );
}
