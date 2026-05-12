import { useState } from "react";
import { Modal, Input, Button } from "../ui";
import { C } from "../../lib/constants";
import type { User } from "../../types";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, username: string, password: string) => Promise<void>;
  loading: boolean;
}

export function AuthModal({ open, onClose, isMobile, onLogin, onRegister, loading }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.includes("@")) e.email = "Enter a valid email address";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (mode === "register") {
      if (username.length < 3) e.username = "Username must be at least 3 characters";
      if (password !== confirm) e.confirm = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (mode === "login") {
      await onLogin(email, password);
    } else {
      await onRegister(email, username, password);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} isMobile={isMobile} maxWidth={440} title={mode === "login" ? "Sign In" : "Create Account"} accentColor={C.accent}>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}>
        {(["login", "register"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setErrors({}); }}
            style={{ flex: 1, padding: "9px 0", background: mode === m ? C.accentGlow : "none", border: "none", color: mode === m ? C.accent : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, borderRight: m === "login" ? `1px solid ${C.border}` : "none" }}>
            {m === "login" ? "SIGN IN" : "REGISTER"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Email" type="email" value={email} onChange={setEmail} required error={errors.email} placeholder="you@example.com" />

        {mode === "register" && (
          <Input label="Username" value={username} onChange={setUsername} required error={errors.username} placeholder="your_handle" maxLength={30} hint="3–30 characters. This is your public identity on BLUE." />
        )}

        <Input label="Password" type="password" value={password} onChange={setPassword} required error={errors.password} placeholder="••••••••" hint={mode === "register" ? "Minimum 8 characters" : undefined} />

        {mode === "register" && (
          <Input label="Confirm Password" type="password" value={confirm} onChange={setConfirm} required error={errors.confirm} placeholder="••••••••" />
        )}

        <Button onClick={handleSubmit} loading={loading} fullWidth size="lg" style={{ marginTop: 4 }}>
          {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </Button>

        {mode === "login" && (
          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
            Demo: use any email from the sample data<br />
            <span style={{ color: C.dim, fontFamily: "monospace" }}>tom@blue.dev · sara@blue.dev · marcus@blue.dev</span>
          </p>
        )}

        <div style={{ padding: "10px 14px", background: `${C.accent}08`, border: `1px solid ${C.accentDim}`, borderRadius: 4, fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
          BLUE is free and open. Your account lets you submit guides, upvote, open disputes, and — if you qualify — become a Verifier.
        </div>
      </div>
    </Modal>
  );
}

// ─── USER MENU ────────────────────────────────────────────────
interface UserMenuProps {
  user: User;
  onLogout: () => void;
  isMobile: boolean;
}
export function UserMenu({ user, onLogout, isMobile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const roleColor = user.role === "admin" ? C.error : user.role === "verifier" ? C.warn : C.accent;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true"
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px", cursor: "pointer", color: C.text }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${roleColor}22`, border: `1px solid ${roleColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: roleColor, fontFamily: "monospace", fontWeight: 700 }}>
          {user.username[0].toUpperCase()}
        </div>
        {!isMobile && <span style={{ fontSize: 11, fontFamily: "monospace", color: C.text }}>{user.username}</span>}
        <span style={{ fontSize: 9, color: C.muted }}>▾</span>
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50, background: "#111", border: `1px solid ${C.borderBright}`, borderRadius: 6, minWidth: 200, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 2 }}>@{user.username}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: roleColor, fontFamily: "monospace", textTransform: "uppercase" }}>{user.role}</span>
                <span style={{ fontSize: 10, color: C.muted }}>·</span>
                <span style={{ fontSize: 10, color: user.standing >= 80 ? C.success : user.standing >= 60 ? C.warn : C.error, fontFamily: "monospace" }}>◆ {user.standing} standing</span>
              </div>
            </div>
            {[
              { label: "My Guides", action: () => setOpen(false) },
              { label: "My Submissions", action: () => setOpen(false) },
              ...(user.role === "verifier" || user.role === "admin" ? [{ label: "Verification Queue", action: () => setOpen(false) }] : []),
              { label: "Settings", action: () => setOpen(false) },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: C.dim, fontSize: 12, fontFamily: "'Georgia', serif", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                {item.label}
              </button>
            ))}
            <button onClick={() => { onLogout(); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: C.error, fontSize: 12, fontFamily: "'Georgia', serif", cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
