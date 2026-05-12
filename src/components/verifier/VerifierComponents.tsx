import { useState } from "react";
import { C, LEVEL_META, NICHES, VERIFICATION } from "../../lib/constants";
import { LevelBadge, Button, Input, Modal, Tabs, EmptyState } from "../ui";
import type { Level, User, VoteFormData } from "../../types";

interface QueueItem {
  id: string; guide_id: string; title: string;
  description: string; niche: string; level: Level;
  content: string; deadline: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VerificationQueue({ queue, onSelectSession }: { queue: QueueItem[]; onSelectSession: (id: string) => void }) {
  if (queue.length === 0 && false) return (  // role check happens at page level
    <EmptyState icon="⚖️" title="Verifier Access Required"
      body="Pass the qualification tests for a niche and level to join the verifier pool."
      action={<Button size="sm" variant="secondary">Start Qualification →</Button>} />
  );
  if (queue.length === 0) return (
    <EmptyState icon="✓" title="Queue empty" body="No pending verifications. You'll be notified when selected." />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {queue.map((session) => {
        return (
          <div key={session.id} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 18px", background: C.surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <LevelBadge level={session.level as Level} />
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{String(session.niche).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 10, color: C.warn, fontFamily: "monospace", flexShrink: 0 }}>
                DUE {new Date(session.deadline).toLocaleDateString()}
              </span>
            </div>
            <h4 style={{ fontSize: 14, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 6 }}>{session.title}</h4>
            <p style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>{session.description}</p>
            <Button onClick={() => onSelectSession(session.id)} size="sm">Open & Vote</Button>
          </div>
        );
      })}
    </div>
  );
}

export function VoteModal({ session, user, isMobile, onSubmit, onClose }: {
  session: QueueItem; user: User; isMobile: boolean;
  onSubmit: (data: VoteFormData) => void; onClose: () => void;
}) {
  void user; // used in dbOpenDispute via closure
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [nicheNote, setNicheNote] = useState("");
  const [levelNote, setLevelNote] = useState("");
  const [activeTab, setActiveTab] = useState("guide");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = LEVEL_META[session.level as Level] ?? LEVEL_META[1];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!decision) e.decision = "You must select approve or reject";
    if (reasoning.length < VERIFICATION.MIN_REASONING_CHARS)
      e.reasoning = `Min ${VERIFICATION.MIN_REASONING_CHARS} characters (${reasoning.length} so far)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    onSubmit({
      decision: decision!,
      reasoning,
      niche_placement: nicheNote || undefined,
      level_placement: levelNote ? (parseInt(levelNote) as Level) : undefined,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} isMobile={isMobile} maxWidth={680} title="Verify Guide" accentColor={m.color}>
      <Tabs tabs={[{ id: "guide", label: "Read Guide" }, { id: "vote", label: "Cast Vote" }]} active={activeTab} onChange={setActiveTab} />
      <div style={{ marginTop: 18 }}>
        {activeTab === "guide" && (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <LevelBadge level={session.level as Level} size="md" />
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{session.niche} · {m.name}</span>
            </div>
            <h2 style={{ fontSize: 18, fontFamily: "'Georgia',serif", color: C.text, marginBottom: 8 }}>{session.title}</h2>
            <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 18 }}>{session.description}</p>
            <div style={{ padding: "12px 14px", background: `${C.accent}06`, border: `1px solid ${C.accentDim}`, borderRadius: 4, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>YOUR RESPONSIBILITIES</div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                <li>Is this guide accurate and safe to follow?</li>
                <li>Is the methodology sound and reproducible?</li>
                <li>Does complexity match Level {session.level} ({m.name})?</li>
                <li>Is the niche placement correct?</li>
              </ul>
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, fontFamily: "'Georgia',serif", whiteSpace: "pre-wrap" }}>
              {session.content}
            </div>
            <div style={{ marginTop: 20 }}>
              <Button onClick={() => setActiveTab("vote")} fullWidth>Proceed to Vote →</Button>
            </div>
          </div>
        )}

        {activeTab === "vote" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>YOUR DECISION *</div>
              <div style={{ display: "flex", gap: 10 }}>
                {(["approve", "reject"] as const).map(d => (
                  <button key={d} onClick={() => setDecision(d)} aria-pressed={decision === d}
                    style={{ flex: 1, padding: 14, border: `2px solid ${decision === d ? (d === "approve" ? C.success : C.error) : C.border}`, borderRadius: 5, background: decision === d ? (d === "approve" ? `${C.success}11` : `${C.error}11`) : "none", color: decision === d ? (d === "approve" ? C.success : C.error) : C.muted, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>
                    {d === "approve" ? "✓ APPROVE" : "✗ REJECT"}
                  </button>
                ))}
              </div>
              {errors.decision && <span role="alert" style={{ fontSize: 11, color: C.error }}>{errors.decision}</span>}
            </div>

            <Input label="Written Reasoning" value={reasoning} onChange={setReasoning} multiline rows={6} required
              placeholder="Explain your vote in detail. Your reasoning is shared with the submitter and other verifiers."
              error={errors.reasoning} hint={`${reasoning.length}/${VERIFICATION.MIN_REASONING_CHARS} minimum`} />

            <div style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 5 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 12 }}>OPTIONAL: SUGGEST DIFFERENT PLACEMENT</div>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
                <Input label="Different Niche?" value={nicheNote} onChange={setNicheNote} placeholder="e.g. This belongs in Chemistry, not Medicine" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>DIFFERENT LEVEL?</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["", "1", "2", "3", "4"].map(l => (
                      <button key={l} onClick={() => setLevelNote(l)}
                        style={{ flex: 1, padding: "8px 0", border: `1px solid ${levelNote === l ? (l ? LEVEL_META[parseInt(l) as Level]?.color : C.accent) : C.border}`, background: levelNote === l ? `${l ? LEVEL_META[parseInt(l) as Level]?.color : C.accent}11` : "none", color: levelNote === l ? (l ? LEVEL_META[parseInt(l) as Level]?.color : C.accent) : C.muted, borderRadius: 3, cursor: "pointer", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>
                        {l || "—"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 14px", background: `${C.warn}08`, border: `1px solid ${C.warn}22`, borderRadius: 4, fontSize: 11, color: C.warn, lineHeight: 1.6 }}>
              Your vote is final. Reasoning is shared with the submitter after the session resolves.
            </div>
            <Button onClick={handleSubmit} loading={submitting} fullWidth>Submit Vote →</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function DisputeModal({ guideId, guideTitle, user, isMobile, onClose }: {
  guideId: string; guideTitle: string; user: User; isMobile: boolean; onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"accuracy" | "placement" | "duplicate" | "other">("accuracy");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (reason.length < 50) { setError("Reason must be at least 50 characters"); return; }
    setSubmitting(true);
    const { dbOpenDispute } = await import("../../lib/db");
    try {
      await dbOpenDispute({ guide_id: guideId, opener_id: user.id, reason });
    } catch (e: any) { setError(e.message); setSubmitting(false); return; }
    setSubmitting(false);
    onClose();
  };

  const types = [
    { id: "accuracy" as const, label: "Inaccurate Information", desc: "Contains factual errors or unsafe instructions" },
    { id: "placement" as const, label: "Wrong Niche or Level", desc: "Belongs in a different niche or at a different level" },
    { id: "duplicate" as const, label: "Duplicate Guide", desc: "Covers the same topic as an existing guide" },
    { id: "other" as const, label: "Other", desc: "Another issue not covered above" },
  ];

  return (
    <Modal open onClose={onClose} isMobile={isMobile} maxWidth={520} title="Open Dispute" accentColor={C.warn}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 14, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 4 }}>"{guideTitle}"</h3>
        <p style={{ fontSize: 11, color: C.muted }}>Standing required: {user.standing}/70 minimum</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>DISPUTE TYPE *</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {types.map(t => (
              <button key={t.id} onClick={() => setType(t.id)} aria-pressed={type === t.id}
                style={{ textAlign: "left", padding: "10px 12px", border: `1px solid ${type === t.id ? C.warn : C.border}`, borderRadius: 4, background: type === t.id ? `${C.warn}08` : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 12, color: type === t.id ? C.warn : C.text, fontWeight: 600, marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <Input label="Reason" value={reason} onChange={v => { setReason(v); setError(""); }} multiline rows={5} required
          placeholder="Describe the issue with specific evidence or references." error={error}
          hint={`${reason.length}/50 minimum`} maxLength={2000} />
        <div style={{ padding: "10px 14px", background: `${C.warn}08`, border: `1px solid ${C.warn}22`, borderRadius: 4, fontSize: 11, color: C.warn, lineHeight: 1.6 }}>
          Frivolous disputes result in a standing penalty. A new Verifier panel will vote to keep, move, or spin off the guide.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting} style={{ flex: 1 }}>Submit Dispute →</Button>
        </div>
      </div>
    </Modal>
  );
}

export function BecomeVerifierCTA({ isMobile }: { isMobile: boolean }) {
  const [niche, setNiche] = useState("Electronics");
  const [level, setLevel] = useState<Level>(1);
  const [started, setStarted] = useState(false);
  return (
    <div style={{ padding: 20, border: `1px solid ${C.accent}33`, borderRadius: 6, background: C.accentGlow }}>
      <div style={{ fontSize: 11, color: C.accent, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>BECOME A VERIFIER</div>
      <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 16 }}>
        Pass the qualification test for a niche and level to join the verifier pool. Higher levels require passing all lower tests.
      </p>
      {!started ? (
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "stretch" : "flex-end" }}>
          <select value={niche} onChange={e => setNiche(e.target.value)}
            style={{ flex: 1, background: "#0d0d0d", border: `1px solid ${C.border}`, borderRadius: 4, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: "'Georgia',serif", outline: "none" }}>
            {NICHES.map(n => <option key={n.name}>{n.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            {([1, 2, 3, 4] as Level[]).map(l => (
              <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l}
                style={{ flex: 1, padding: "9px 10px", border: `1px solid ${level === l ? LEVEL_META[l].color : C.border}`, background: level === l ? `${LEVEL_META[l].color}11` : "none", color: level === l ? LEVEL_META[l].color : C.muted, borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>
                L{l}
              </button>
            ))}
          </div>
          <Button onClick={() => setStarted(true)}>Start Test →</Button>
        </div>
      ) : (
        <div style={{ padding: 20, border: `1px solid ${C.border}`, borderRadius: 5, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🏗️</div>
          <p style={{ fontSize: 13, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 6 }}>Qualification: {niche} — Level {level}</p>
          <p style={{ fontSize: 12, color: C.muted }}>Tests are generated from approved guide content and reviewed by existing verifiers.</p>
          <Button onClick={() => setStarted(false)} variant="ghost" size="sm" style={{ marginTop: 12 }}>← Back</Button>
        </div>
      )}
    </div>
  );
}
