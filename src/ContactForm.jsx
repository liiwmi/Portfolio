import { useRef, useState } from "react";

const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || "/api/contact";
const FALLBACK = import.meta.env.VITE_CONTACT_EMAIL || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY = { name: "", email: "", subject: "", message: "" };
const MAX = { name: 80, email: 120, subject: 120, message: 2000 };

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2)
    e.name = "Enter your name (2 characters or more).";
  if (!EMAIL_RE.test(v.email.trim()))
    e.email = "Enter a valid return address, like name@example.com.";
  if (v.subject.trim().length < 3)
    e.subject = "Add a subject (3 characters or more).";
  if (v.message.trim().length < 10)
    e.message = "Write at least 10 characters so the message is useful.";
  return e;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mono field-hint">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="field-error mono" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [trap, setTrap] = useState("");
  const [openedAt] = useState(() => Date.now());
  const formRef = useRef(null);

  const bind = (k) => ({
    id: k,
    name: k,
    value: values[k],
    maxLength: MAX[k],
    "aria-invalid": errors[k] ? "true" : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
    onChange: (e) => {
      const next = { ...values, [k]: e.target.value };
      setValues(next);
      if (errors[k]) setErrors((p) => ({ ...p, [k]: validate(next)[k] }));
    },
    onBlur: () => {
      if (values[k]) setErrors((p) => ({ ...p, [k]: validate(values)[k] }));
    },
  });

  const mailto = () =>
    `mailto:${FALLBACK}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(
      `${values.message}\n\n${values.name} (${values.email})`,
    )}`;

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;
    const errs = validate(values);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      formRef.current?.elements[first]?.focus();
      return;
    }

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      message: values.message.trim(),
      company: trap,
      elapsed: Date.now() - openedAt,
    };
    setStatus("sending");
    setServerError("");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON response */
      }
      if (res.ok && data?.ok === true) {
        setSentTo(payload.email);
        setValues(EMPTY);
        setErrors({});
        setStatus("sent");
      } else {
        setServerError(
          data?.error ||
            (res.status === 404
              ? "The transmission relay is not available in this environment."
              : "Transmission failed. Nothing was sent."),
        );
        setStatus("error");
      }
    } catch (err) {
      setServerError(
        err.name === "AbortError"
          ? "No response from the relay. Nothing was confirmed as sent."
          : "Network error. Check your connection and try again.",
      );
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  if (status === "sent") {
    return (
      <div className="notice" role="status">
        <p className="label">Transmission confirmed</p>
        <p>Your message was delivered. Any reply will go to {sentTo}.</p>
        <button
          type="button"
          className="send mono"
          onClick={() => setStatus("idle")}
        >
          SEND ANOTHER
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="form"
      onSubmit={onSubmit}
      noValidate
      aria-busy={status === "sending"}
    >
      <Field id="name" label="Name" error={errors.name}>
        <input type="text" autoComplete="name" {...bind("name")} />
      </Field>
      <Field id="email" label="Return address" error={errors.email}>
        <input type="email" autoComplete="email" {...bind("email")} />
      </Field>
      <Field id="subject" label="Subject" error={errors.subject}>
        <input type="text" {...bind("subject")} />
      </Field>
      <Field
        id="message"
        label="Message"
        error={errors.message}
        hint={`${values.message.length}/${MAX.message}`}
      >
        <textarea rows="6" {...bind("message")} />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots */}
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
        </label>
      </div>

      {status === "error" && (
        <div className="notice error" role="alert">
          <p>{serverError}</p>
          {FALLBACK && (
            <p>
              <a className="mono" href={mailto()}>
                Open in your email app instead
              </a>
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="send mono"
        disabled={status === "sending"}
      >
        {status === "sending" ? "TRANSMITTING..." : "SEND TRANSMISSION"}
      </button>
    </form>
  );
}
