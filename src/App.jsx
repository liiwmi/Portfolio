import { useCallback, useEffect, useRef, useState } from "react";
import Starfield from "./Starfield.jsx";
import TauMarker from "./TauMarker.jsx";
import Loader from "./Loader.jsx";
import ContactForm from "./ContactForm.jsx";
import {
  useBoot,
  useGyro,
  useScramble,
  useUptime,
  useRotating,
  prefersReducedMotion,
} from "./hooks.js";
import { startWarp, retarget, setTarget, SWAP, END } from "./warp.js";
import { profile, projects, skills, contacts, messages } from "./content.js";

const SECTIONS = [
  ["top", "Home"],
  ["about", "About"],
  ["projects", "Projects"],
  ["skills", "Skills"],
  ["contact", "Contact"],
];
const NAV = SECTIONS.slice(1);
const GREETING = "Hello, there! I am Steph";

const hashId = () => {
  const h = window.location.hash.slice(1);
  return SECTIONS.some(([id]) => id === h) ? h : "top";
};

/** Travel state machine. Clicks during acceleration retarget; later clicks queue. */
function useTravel(initial) {
  const [current, setCurrent] = useState(initial);
  const [phase, setPhase] = useState("idle"); // idle | out | in
  const st = useRef({
    busy: false,
    swapped: false,
    target: initial,
    queued: null,
    current: initial,
    timers: [],
  });

  useEffect(() => {
    const timers = st.current.timers;
    return () => timers.forEach(clearTimeout);
  }, []);

  const go = useCallback(function go(id) {
    const s = st.current;
    if (s.busy) {
      if (s.swapped) {
        if (id !== s.current) s.queued = id;
      } else if (id !== s.target) {
        s.target = id;
        retarget(id);
      }
      return;
    }
    if (id === s.current) {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      return;
    }
    const commit = (to) => {
      s.current = to;
      setCurrent(to);
      window.scrollTo({ top: 0, behavior: "instant" });
      window.history.replaceState(
        null,
        "",
        to === "top"
          ? window.location.pathname + window.location.search
          : `#${to}`,
      );
    };
    if (prefersReducedMotion()) {
      setTarget(id);
      commit(id);
      return;
    }

    s.busy = true;
    s.swapped = false;
    s.target = id;
    setPhase("out");
    const dur = startWarp(id);
    s.timers.push(
      setTimeout(
        () => {
          commit(s.target);
          s.swapped = true;
          setPhase("in");
        },
        Math.round(dur * SWAP[id]),
      ),
    );
    s.timers.push(
      setTimeout(
        () => {
          s.busy = false;
          setPhase("idle");
          const q = s.queued;
          s.queued = null;
          if (q && q !== s.current) go(q);
        },
        Math.round(dur * END[id]),
      ),
    );
  }, []);

  return { current, phase, go };
}

function Readout({ label, value }) {
  return (
    <div className="readout">
      <span className="label">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

const Uptime = () => useUptime();
const Status = () => useRotating(messages);

function Nav({ current, onGo }) {
  return (
    <header className="topbar">
      <a
        className="mono prompt"
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onGo("top");
        }}
      >
        SYSTEM://STEPH/PORTFOLIO
      </a>
      <nav aria-label="Primary">
        <ul>
          {NAV.map(([id, label], i) => (
            <li key={id}>
              <a
                className="mono"
                href={`#${id}`}
                aria-current={current === id ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onGo(id);
                }}
              >
                <span className="dim">0{i + 1} /</span> {label.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Hero({ active }) {
  const textRef = useRef(null);
  const [done, setDone] = useState(false);
  const onDone = useCallback(() => setDone(true), []);
  useScramble(textRef, GREETING, active, onDone);

  return (
    <div className="hero">
      <p className="mono init" aria-hidden="true">
        {done ? "INTERFACE ONLINE" : "INITIALIZING PERSONAL INTERFACE..."}
      </p>
      <h1 id="greeting" aria-label={GREETING}>
        <span ref={textRef} aria-hidden="true" />
        <span className={`cursor ${done ? "blink" : ""}`} aria-hidden="true" />
      </h1>
      <p className="mono status" aria-live="polite">
        <Status />
      </p>
      <dl className="readouts">
        <Readout label="Mission status" value="NOMINAL" />
        <Readout label="Destination" value="TAU CETI" />
        <Readout label="Designation" value="HD 10700 / 11.9 LY" />
        <Readout label="Uptime" value={<Uptime />} />
        <Readout label="Link" value="● SIGNAL STABLE" />
      </dl>
    </div>
  );
}

function Panel({ id, title, tag, children }) {
  return (
    <div className="panel">
      <header className="panel-head">
        <h2 id={`${id}-h`}>{title}</h2>
        <span className="mono label">{tag}</span>
      </header>
      {children}
    </div>
  );
}

function About() {
  return (
    <Panel id="about" title="Personnel record" tag="CREW MEMBER: STEPH">
      <div className="about">
        <div>
          {profile.bio.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <dl className="facts">
          {profile.facts.map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}

function Projects() {
  return (
    <Panel
      id="projects"
      title="Mission archive"
      tag={`${projects.length} ENTRIES`}
    >
      <ul className="archive">
        {projects.map((p) => (
          <li key={p.name} className="entry">
            <div className="entry-main">
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
              <p className="mono stack">{p.stack.join(" · ")}</p>
            </div>
            <div className="entry-meta">
              <span className="mono label">{p.status}</span>
              <span className="links mono">
                {p.live && (
                  <a href={p.live}>
                    Live<span className="sr"> — {p.name}</span>
                  </a>
                )}
                {p.code && (
                  <a href={p.code}>
                    Source<span className="sr"> — {p.name}</span>
                  </a>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Skills() {
  return (
    <Panel id="skills" title="Capability report" tag="EQUIPMENT INVENTORY">
      <div className="skills">
        {skills.map(([group, items]) => (
          <div key={group}>
            <h3 className="label">{group}</h3>
            <ul>
              {items.map((s) => (
                <li key={s} className="mono">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Contact() {
  return (
    <Panel id="contact" title="Communications console" tag="MISSION COMPLETE">
      <div className="comms">
        <ContactForm />
        <div>
          <p className="tx" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </p>
          <ul className="channels">
            {contacts.map(([name, text, href]) => (
              <li key={name}>
                <span className="label">{name}</span>
                <a className="mono" href={href}>
                  {text}
                </a>
              </li>
            ))}
          </ul>
          <p className="mono sign">
            END OF TRANSMISSION. Thanks for flying with us.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Screen({ id, labelledBy, active, children }) {
  return (
    <section
      id={`screen-${id}`}
      data-section={id}
      className="screen"
      hidden={!active}
      tabIndex={-1}
      aria-labelledby={labelledBy}
    >
      <div className="screen-inner">{children}</div>
    </section>
  );
}

export default function App() {
  const boot = useBoot();
  const [initial] = useState(() => {
    const id = hashId();
    setTarget(id);
    return id;
  });
  const { current, phase, go } = useTravel(initial);
  const [loaderGone, setLoaderGone] = useState(false);
  const tiltRef = useRef(null);
  const firstRender = useRef(true);
  useGyro(tiltRef);

  useEffect(() => {
    if (!boot.ready) return;
    const id = setTimeout(() => setLoaderGone(true), 700);
    return () => clearTimeout(id);
  }, [boot.ready]);

  // After arriving, move focus into the new section without scrolling.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document
      .getElementById(`screen-${current}`)
      ?.focus({ preventScroll: true });
  }, [current]);

  useEffect(() => {
    const onHash = () => go(hashId());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [go]);

  return (
    <>
      <a
        className="skip"
        href="#screen-about"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(`screen-${current}`)?.focus();
        }}
      >
        Skip to content
      </a>

      <Starfield />
      <TauMarker
        section={current}
        traveling={phase !== "idle"}
        ready={boot.ready}
      />
      <div className="screen-fx" aria-hidden="true" />
      <div className="frame" aria-hidden="true">
        <b />
        <b />
        <b />
        <b />
      </div>

      <div
        className={`stage ${boot.ready ? "is-ready" : ""}`}
        data-phase={phase}
      >
        <div className="perspective">
          <div className="tilt" ref={tiltRef}>
            <Nav current={current} onGo={go} />
            <main className="viewport">
              <Screen id="top" labelledBy="greeting" active={current === "top"}>
                <Hero active={boot.ready} />
              </Screen>
              <Screen
                id="about"
                labelledBy="about-h"
                active={current === "about"}
              >
                <About />
              </Screen>
              <Screen
                id="projects"
                labelledBy="projects-h"
                active={current === "projects"}
              >
                <Projects />
              </Screen>
              <Screen
                id="skills"
                labelledBy="skills-h"
                active={current === "skills"}
              >
                <Skills />
              </Screen>
              <Screen
                id="contact"
                labelledBy="contact-h"
                active={current === "contact"}
              >
                <Contact />
              </Screen>
            </main>
          </div>
        </div>
      </div>

      {boot.show && !loaderGone && (
        <Loader stage={boot.stage} leaving={boot.ready} />
      )}
    </>
  );
}
