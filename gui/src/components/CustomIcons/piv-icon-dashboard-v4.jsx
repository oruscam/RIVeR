import './piv-icons.css'
import { useState, useRef, useEffect } from "react";


/* ─── INLINE SVG ICONS (Lucide paths, no library needed) ─── */
const I = ({ d, size = 21, color = "currentColor", extra = [] }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {[d, ...extra].map((path, i) => <path key={i} d={path} />)}
  </svg>
);

const Icons = {
  Eye: (c) => <I color={c} d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" extra={["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />,
  EyeOff: (c) => <I color={c} d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" extra={["M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19", "M1 1l22 22", "M10.73 10.73a3 3 0 0 0 4.2 4.2"]} />,
  Lock: (c) => <I color={c} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" extra={["M7 11V7a5 5 0 0 1 10 0v4"]} />,
  Unlock: (c) => <I color={c} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" extra={["M7 11V7a5 5 0 0 1 9.9-1"]} />,
  Copy: (c) => <I color={c} d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866" extra={["M18 21H10a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"]} />,
  Check: (c) => <I color={c} d="M20 6L9 17l-5-5" />,
  Trash: (c) => <I color={c} d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />,
  BoxSel: (c) => <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3H3v2" /><path d="M19 3h2v2" /><path d="M5 21H3v-2" /><path d="M19 21h2v-2" /><path strokeDasharray="3 3" d="M3 9v6M21 9v6M9 3h6M9 21h6" /></svg>,
  PenLine: (c) => <I color={c} d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  Globe: (c) => <I color={c} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" extra={["M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]} />,
  ChevDown: (c, rot) => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot || 0}deg)`, transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>,
  Play: (c) => <I color={c} d="M5 3l14 9-14 9V3z" />,
  Pause: (c) => <I color={c} d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  Video: (c) => <I color={c} d="M23 7l-7 5 7 5V7z" extra={["M1 5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z".replace("-2", "0")]} />,
  Loader: (c) => <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>,
  Download: (c) => <I color={c} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  SoundOn: (c) => <I color={c} d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" extra={["M16 9a5 5 0 0 1 0 6", "M19.364 18.364a9 9 0 0 0 0-12.728"]} />,
  SoundOff: (c) => <I color={c} d="M16 9a5 5 0 0 1 .95 2.293" extra={["M19.364 5.636a9 9 0 0 1 1.889 9.96", "m2 2 20 20", "m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11", "M9.828 4.172A.686.686 0 0 1 11 4.657v.686"]} />
};


export function Pill({ label, color }) {
  return <span className="pill" style={{ color, borderColor: color + "44", background: color + "11" }}>{label}</span>;
}
export function Info({ name, desc, pill }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{name}</span>
      <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, maxWidth: 270 }}>{desc}</span>
      {pill}
    </div>
  );
}
function useRipple() {
  const [ripples, setRipples] = useState([]);
  const fire = (color) => {
    const id = Date.now() + Math.random();
    setRipples(r => [...r, { id, color }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 560);
  };
  const nodes = ripples.map(r => <span key={r.id} className="rpl" style={{ background: r.color }} />);
  return [nodes, fire];
}

/* ── 1. EYE ── */
export function EyeBtn() {
  const [on, setOn] = useState(true);
  const [rpl, fire] = useRipple();
  return (
    <div className="row">
      <button className={`ib ${on ? "active" : ""}`} style={{ "--hi": "var(--accent)" }}
        onClick={() => { setOn(v => !v); fire("var(--accent)") }}>
        {rpl}
        <span className={`cl ${on ? "show" : "hide"}`}>{Icons.Eye("var(--accent)")}</span>
        <span className={`cl ${on ? "hide" : "show"}`}>{Icons.EyeOff("var(--muted)")}</span>
      </button>
      <Info name="Eye / EyeOff" desc="Toggle results overlay. Crossfade + scale swap on click."
        pill={<Pill label={on ? "VISIBLE" : "HIDDEN"} color={on ? "var(--green)" : "var(--muted)"} />} />
    </div>
  );
}

/* ── 2. LOCK ── */
export function LockBtn() {
  const [locked, setLocked] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);
  const [rpl, fire] = useRipple();
  const toggle = () => {
    if (locked) setShakeKey(k => k + 1);
    fire(locked ? "var(--amber)" : "var(--green)");
    setLocked(v => !v);
  };
  return (
    <div className="row">
      <button className={`ib ${locked ? "active" : ""}`}
        style={{ "--hi": locked ? "var(--amber)" : "var(--green)" }} onClick={toggle}>
        {rpl}
        <span key={shakeKey} className={`cl ${locked ? "show" : "hide"} ${shakeKey > 0 ? "wiggle" : ""}`}>
          {Icons.Lock("var(--amber)")}
        </span>
        <span className={`cl ${locked ? "hide" : "show"}`}>{Icons.Unlock("var(--green)")}</span>
      </button>
      <Info name="Lock / Unlock" desc="Lock mask from editing. Shakes on locking. Amber = locked, green = open."
        pill={<Pill label={locked ? "LOCKED" : "UNLOCKED"} color={locked ? "var(--amber)" : "var(--green)"} />} />
    </div>
  );
}

/* ── 3. COPY ── */
export function CopyBtn() {
  const [done, setDone] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const handle = () => {
    if (done) return;
    setDone(true); setPopKey(k => k + 1);
    setTimeout(() => setDone(false), 2200);
  };
  return (
    <div className="row">
      <button className={`ib ${done ? "active" : ""}`} style={{ "--hi": "var(--green)" }} onClick={handle}>
        <span className={`cl ${done ? "hide" : "show"}`}>{Icons.Copy("var(--text)")}</span>
        <span key={popKey} className={`cl ${done ? "show cpop" : "hide"}`}>{Icons.Check("var(--green)")}</span>
      </button>
      <Info name="Copy → Check" desc="Copy velocity table. Morphs to ✓ for 2 s then auto-resets."
        pill={<Pill label={done ? "COPIED ✓" : "READY"} color={done ? "var(--green)" : "var(--muted)"} />} />
    </div>
  );
}

/* ── 4. TRASH ── */
export function TrashBtn() {
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState(false);
  const [wigKey, setWigKey] = useState(0);
  const [rpl, fire] = useRipple();
  const timerRef = useRef(null);
  const onClick = () => {
    fire("var(--red)");
    if (!armed) { setArmed(true); timerRef.current = setTimeout(() => setArmed(false), 2500); }
    else { clearTimeout(timerRef.current); setArmed(false); }
  };
  return (
    <div className="row">
      <button className={`ib ${armed ? "active" : ""}`}
        style={{
          "--hi": "var(--red)",
          borderColor: hover ? "rgba(248,113,113,.35)" : undefined,
          background: hover ? "rgba(248,113,113,.07)" : undefined
        }}
        onClick={onClick}
        onMouseEnter={() => { setHover(true); setWigKey(k => k + 1) }}
        onMouseLeave={() => setHover(false)}>
        {rpl}
        <span key={wigKey} className={hover ? "wiggle" : ""} style={{ display: "flex" }}>
          {Icons.Trash(hover || armed ? "var(--red)" : "var(--text)")}
        </span>
      </button>
      <Info name="Trash2" desc="Hover → wiggles red. Click once to arm, click again to confirm delete."
        pill={<Pill label={armed ? "CONFIRM DELETE?" : "IDLE"} color={armed ? "var(--red)" : "var(--muted)"} />} />
    </div>
  );
}

/* ── 5. MASK ── */
export function MaskBtn() {
  const [drawing, setDrawing] = useState(false);
  const [rpl, fire] = useRipple();
  const timerRef = useRef(null);
  const toggle = () => {
    const next = !drawing;
    setDrawing(next);
    if (next) { fire("var(--violet)"); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setDrawing(false), 4000); }
  };
  return (
    <div className="row">
      <button className={`ib ${drawing ? "active pulse" : ""}`} style={{ "--hi": "var(--violet)" }} onClick={toggle}>
        {rpl}
        <span className={`cl ${drawing ? "hide" : "show"}`}>{Icons.BoxSel("var(--text)")}</span>
        <span className={`cl ${drawing ? "show" : "hide"}`}>{Icons.PenLine("var(--violet)")}</span>
      </button>
      <Info name="BoxSelect → PenLine" desc="Activate mask-draw mode. Pulsing ring while active. Auto-cancels after 4 s."
        pill={<Pill label={drawing ? "DRAWING…" : "IDLE"} color={drawing ? "var(--violet)" : "var(--muted)"} />} />
    </div>
  );
}

/* ── 6. LANGUAGE ── */
const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];
export function LangBtn() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("en");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const lang = LANGS.find(l => l.code === sel);
  return (
    <div className="row">
      <div className="lwrap" ref={ref}>
        <button className={`ib ${open ? "active" : ""}`}
          style={{ "--hi": "var(--accent)", width: 60, gap: 3, paddingInline: 10 }}
          onClick={() => setOpen(v => !v)}>
          {Icons.Globe(open ? "var(--accent)" : "var(--text)")}
          {Icons.ChevDown("var(--muted)", open ? 180 : 0)}
        </button>
        <div className={`ldrop ${open ? "open" : ""}`}>
          {LANGS.map(l => (
            <div key={l.code} className={`litem ${l.code === sel ? "sel" : ""}`}
              onClick={() => { setSel(l.code); setOpen(false) }}>
              <span style={{ fontSize: 17 }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === sel && <span style={{ marginLeft: "auto", display: "flex" }}>{Icons.Check("var(--accent)")}</span>}
            </div>
          ))}
        </div>
      </div>
      <Info name="Globe + ChevronDown" desc="Select UI language. Chevron rotates on open, spring dropdown."
        pill={<Pill label={`${lang.flag} ${lang.label.toUpperCase()}`} color="var(--accent)" />} />
    </div>
  );
}

/* ── 7. PLAY/PAUSE ── */
export function PlayBtn() {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);
  const [rpl, fire] = useRipple();
  const toggle = () => { setPlaying(v => !v); setKey(k => k + 1); fire("var(--accent)"); };
  return (
    <div className="row">
      <button className={`ib ${playing ? "active" : ""}`} style={{ "--hi": "var(--accent)" }} onClick={toggle}>
        {rpl}
        <span key={key} className="cl show ppop">
          {playing ? Icons.Pause("var(--accent)") : Icons.Play("var(--text)")}
        </span>
      </button>
      <Info name="Play / Pause" desc="Play/pause PIV animation. Single icon swaps with spring-pop each toggle."
        pill={<Pill label={playing ? "▶ PLAYING" : "⏸ PAUSED"} color={playing ? "var(--accent)" : "var(--muted)"} />} />
    </div>
  );
}

/* ── 8. EXPORT ── */
export function ExportBtn({ isCreating, onClick }) {
  const [phase, setPhase] = useState("idle");
  const [rpl, fire] = useRipple();

  useEffect(() => {
    if (isCreating) {
      setPhase("running");
    } else if (phase === "running") {
      setPhase("done");
      setTimeout(() => setPhase("idle"), 2500);
    }
  }, [isCreating]);
  const handleClick = (e) => {
    if (phase !== "idle") return;
    fire("var(--accent)");
    onClick(e);
  };
  const hi = phase === "done" ? "var(--green)" : "var(--accent)";
  return (
    <div className="row">
      <button className={`ib ${phase !== "idle" ? "active" : ""}`}
        style={{ "--hi": hi, cursor: phase === "running" ? "wait" : "pointer" }} onClick={handleClick}>
        {rpl}
        {phase === "running" && <span className="progbar" />}
        <span className={`cl ${phase === "idle" ? "show" : "hide"}`}>{Icons.Video("var(--text)")}</span>
        <span className={`cl ${phase === "running" ? "show" : "hide"}`}>
          <span className="spin">{Icons.Loader("var(--accent)")}</span>
        </span>
        <span className={`cl ${phase === "done" ? "show bdrop" : "hide"}`}>{Icons.Download("var(--green)")}</span>
      </button>
    </div>
  );
}

/* ── 9. SOUND ── */
export function SoundBtn() {
  const [muted, setMuted] = useState(true);
  const [rpl, fire] = useRipple();
  return (
    <div className="row">
      <button className={`ib ${muted ? "active" : ""}`} style={{ "--hi": "var(--accent)" }}
        onClick={() => { setMuted(v => !v); fire("var(--accent)"); }}>
        {rpl}
        <span className={`cl ${muted ? "show" : "hide"}`}>{Icons.SoundOff("var(--muted)")}</span>
        <span className={`cl ${muted ? "hide" : "show"}`}>{Icons.SoundOn("var(--accent)")}</span>
      </button>
      <Info name="SoundOn / SoundOff" desc="Toggle mute. Muted by default. Swaps icon on each click."
        pill={<Pill label={muted ? "MUTED" : "SOUND ON"} color={muted ? "var(--muted)" : "var(--accent)"} />} />
    </div>
  );
}

/* ── APP ── */
const SECTIONS = [
  { label: "01 — Visibility", C: EyeBtn },
  { label: "02 — Lock", C: LockBtn },
  { label: "03 — Copy Table", C: CopyBtn },
  { label: "04 — Delete", C: TrashBtn },
  { label: "05 — Add Mask", C: MaskBtn },
  { label: "06 — Language", C: LangBtn },
  { label: "07 — Play / Pause", C: PlayBtn },
  { label: "08 — Export Video", C: ExportBtn },
];
