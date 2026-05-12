import { useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { C, LEVEL_META } from "../../lib/constants";
import { useFocusTrap } from "../../hooks";
import type { Level } from "../../types";

// ─── LEVEL BADGE ─────────────────────────────────────────────
interface LevelBadgeProps { level: Level; size?: "xs" | "sm" | "md" }
export function LevelBadge({ level, size = "sm" }: LevelBadgeProps) {
  const m = LEVEL_META[level];
  const pad = size === "xs" ? "1px 6px" : size === "sm" ? "2px 8px" : "4px 12px";
  const fs = size === "xs" ? 9 : size === "sm" ? 10 : 12;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: pad, borderRadius: 3, border: `1px solid ${m.color}33`, background: `${m.color}11`, color: m.color, fontSize: fs, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}
      aria-label={`Level ${level}: ${m.name}`}>
      {m.label}
    </span>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
  style?: CSSProperties;
}
export function Button({ children, onClick, variant = "primary", size = "md", disabled, loading, fullWidth, type = "button", ariaLabel, style }: ButtonProps) {
  const pad = size === "sm" ? "6px 12px" : size === "md" ? "9px 18px" : "12px 24px";
  const fs = size === "sm" ? 11 : size === "md" ? 12 : 13;

  const variantStyles: CSSProperties = {
    primary:   { background: C.accent,  color: "#000", border: "none" },
    secondary: { background: "none",    color: C.accent, border: `1px solid ${C.accentDim}` },
    ghost:     { background: "none",    color: C.muted, border: `1px solid ${C.border}` },
    danger:    { background: C.error,   color: "#000", border: "none" },
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      style={{
        ...variantStyles,
        padding: pad, borderRadius: 4,
        fontSize: fs, fontWeight: 700, letterSpacing: 1,
        fontFamily: "monospace", cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : undefined,
        transition: "opacity 0.15s, filter 0.15s",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        ...style,
      }}
    >
      {loading ? <Spinner size={fs} /> : children}
    </button>
  );
}

// ─── SPINNER ─────────────────────────────────────────────────
export function Spinner({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} style={{ animation: "spin 0.7s linear infinite", width: "100%", height: "100%" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <circle cx="12" cy="12" r="10" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ─── INPUT ────────────────────────────────────────────────────
interface InputProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  style?: CSSProperties;
}
export function Input({ label, value, onChange, placeholder, type = "text", required, error, hint, disabled, id, multiline, rows = 4, maxLength, style }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const baseStyle: CSSProperties = {
    width: "100%", background: "#0d0d0d",
    border: `1px solid ${error ? C.error : C.border}`,
    borderRadius: 4, padding: "10px 12px",
    color: C.text, fontSize: 13,
    fontFamily: "'Georgia', serif", outline: "none",
    boxSizing: "border-box", resize: multiline ? "vertical" : undefined,
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>
          {label.toUpperCase()}{required && <span style={{ color: C.error, marginLeft: 2 }}>*</span>}
        </label>
      )}
      {multiline ? (
        <textarea id={inputId} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} style={baseStyle} />
      ) : (
        <input id={inputId} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} disabled={disabled} required={required} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} style={baseStyle} />
      )}
      {error && <span id={`${inputId}-error`} role="alert" style={{ fontSize: 11, color: C.error }}>{error}</span>}
      {hint && !error && <span id={`${inputId}-hint`} style={{ fontSize: 11, color: C.muted }}>{hint}</span>}
      {maxLength && <span style={{ fontSize: 10, color: C.muted, textAlign: "right", fontFamily: "monospace" }}>{value.length}/{maxLength}</span>}
    </div>
  );
}

// ─── SELECT ───────────────────────────────────────────────────
interface SelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}
export function Select({ label, value, onChange, options, required, error }: SelectProps) {
  const id = label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label htmlFor={id} style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>{label.toUpperCase()}{required && <span style={{ color: C.error, marginLeft: 2 }}>*</span>}</label>}
      <select id={id} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error} style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${error ? C.error : C.border}`, borderRadius: 4, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "'Georgia', serif", outline: "none", cursor: "pointer" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span role="alert" style={{ fontSize: 11, color: C.error }}>{error}</span>}
    </div>
  );
}

// ─── TAG INPUT ────────────────────────────────────────────────
interface TagInputProps { tags: string[]; onChange: (tags: string[]) => void; label?: string; max?: number }
export function TagInput({ tags, onChange, label = "Tags", max = 8 }: TagInputProps) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < max) { onChange([...tags, t]); setInput(""); }
  };
  const remove = (t: string) => onChange(tags.filter(x => x !== t));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>{label.toUpperCase()} <span style={{ color: C.muted }}>({tags.length}/{max})</span></span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "#0d0d0d", minHeight: 40 }}>
        {tags.map(t => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: C.accentGlow, border: `1px solid ${C.accentDim}`, borderRadius: 3, fontSize: 11, color: C.accent, fontFamily: "monospace" }}>
            #{t}
            <button onClick={() => remove(t)} aria-label={`Remove tag ${t}`} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "0 2px", fontSize: 12, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } if (e.key === "," ) { e.preventDefault(); add(); }}} placeholder={tags.length < max ? "Type and press Enter..." : ""} disabled={tags.length >= max} style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 12, fontFamily: "'Georgia', serif", minWidth: 120, flex: 1 }} />
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  isMobile?: boolean;
  maxWidth?: number;
  accentColor?: string;
}
export function Modal({ open, onClose, title, children, isMobile, maxWidth = 640, accentColor }: ModalProps) {
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 24 }}
      onClick={onClose}
    >
      <div ref={trapRef}
        style={{ background: "#111", border: `1px solid ${accentColor ? accentColor + "44" : C.borderBright}`, borderRadius: isMobile ? "14px 14px 0 0" : 8, padding: isMobile ? "20px 18px 36px" : "28px 32px", width: "100%", maxWidth: isMobile ? "100%" : maxWidth, maxHeight: isMobile ? "92vh" : "85vh", overflowY: "auto", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        {accentColor && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, borderRadius: isMobile ? "14px 14px 0 0" : "8px 8px 0 0" }} />}
        {isMobile && <div style={{ width: 36, height: 4, background: C.borderBright, borderRadius: 2, margin: "4px auto 18px" }} />}
        {title && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, color: C.accent, fontFamily: "monospace", letterSpacing: 2, margin: 0 }}>{title.toUpperCase()}</h2>
            <button onClick={onClose} aria-label="Close dialog" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 2px" }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 16, radius = 3, style }: { width?: string | number; height?: number; radius?: number; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ width, height, borderRadius: radius, background: `linear-gradient(90deg, ${C.surface} 25%, ${C.border} 50%, ${C.surface} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", ...style }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "20px 22px" }} aria-busy="true" aria-label="Loading guide">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><Skeleton width={32} height={20} /><Skeleton width={80} height={20} /></div>
      <Skeleton height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={18} style={{ marginBottom: 12 }} />
      <Skeleton height={12} style={{ marginBottom: 6 }} />
      <Skeleton height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={12} style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 6 }}><Skeleton width={60} height={20} /><Skeleton width={80} height={20} /></div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────
interface EmptyStateProps { icon?: string; title: string; body: string; action?: ReactNode }
export function EmptyState({ icon = "◌", title, body, action }: EmptyStateProps) {
  return (
    <div role="status" style={{ textAlign: "center", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 32, color: C.muted }}>{icon}</span>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.dim, margin: 0 }}>{title}</h3>
      <p style={{ fontSize: 12, color: C.muted, maxWidth: 320, lineHeight: 1.7, margin: 0 }}>{body}</p>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────
interface ToastProps { message: string; type?: "success" | "error" | "info"; onDismiss: () => void }
export function Toast({ message, type = "info", onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const color = type === "success" ? C.success : type === "error" ? C.error : C.accent;
  return (
    <div role="alert" aria-live="assertive" style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "#1a1a1a", border: `1px solid ${color}44`, borderRadius: 6, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", maxWidth: "90vw" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.text, fontFamily: "'Georgia', serif" }}>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, marginLeft: 4 }}>✕</button>
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────
interface TabsProps { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div role="tablist" style={{ display: "flex", borderBottom: `1px solid ${C.border}`, gap: 0 }}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}
          style={{ background: "none", border: "none", color: active === t.id ? C.accent : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, padding: "10px 16px", borderBottom: active === t.id ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1, transition: "color 0.15s" }}>
          {t.label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── STANDING BADGE ──────────────────────────────────────────
export function StandingBadge({ standing }: { standing: number }) {
  const color = standing >= 80 ? C.success : standing >= 60 ? C.warn : C.error;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 3, border: `1px solid ${color}33`, background: `${color}11`, fontSize: 10, color, fontFamily: "monospace", fontWeight: 700 }}>
      ◆ {standing}
    </span>
  );
}
