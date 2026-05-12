import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { C, LEVEL_META, NICHES, STANDING, VERIFICATION } from "./lib/constants";
import {
  useBreakpoint, useAuth, useNotifications, useGuideFilter, useGuides, useUpvote,
} from "./hooks";
import {
  LevelBadge, Button, Input, Select, TagInput, Modal, EmptyState,
  CardSkeleton, Toast, Tabs, Spinner,
} from "./components/ui";
import {
  dbGetGuide, dbCreateGuide, dbSaveMethods, dbSaveMaterials,
  dbSavePrerequisites, dbSubmitGuide,
  dbGetVerifierQueue, dbStats,
} from "./lib/db";
import type { Guide, Level, User, Method, Material } from "./types";

// ─── GUIDE CARD ───────────────────────────────────────────────
function GuideCard({ guide, onClick, isMobile }: { guide: Guide; onClick: (g: Guide) => void; isMobile: boolean }) {
  const [hovered, setHovered] = useState(false);
  const m = LEVEL_META[guide.level];
  return (
    <article
      onClick={() => onClick(guide)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0} role="button"
      aria-label={`View guide: ${guide.title}`}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick(guide)}
      style={{
        background: hovered ? C.surfaceHover : C.surface,
        border: `1px solid ${hovered ? m.color + "55" : C.border}`,
        borderRadius: 6, padding: isMobile ? 16 : "20px 22px",
        cursor: "pointer", transition: "all 0.18s ease",
        position: "relative", overflow: "hidden",
        outline: "none", WebkitTapHighlightColor: "transparent",
      }}
    >
      {hovered && <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${m.color}88,transparent)` }} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <LevelBadge level={guide.level} />
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>{guide.niche.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>▲ {guide.upvotes}</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>✓ {guide.verifier_count}</span>
        </div>
      </div>
      <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: C.text, marginBottom: 6, fontFamily: "'Georgia',serif", lineHeight: 1.35 }}>{guide.title}</h3>
      <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 12 }}>{guide.description}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {guide.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: 10, color: C.muted, padding: "2px 7px", borderRadius: 2, border: `1px solid ${C.border}`, fontFamily: "monospace" }}>#{t}</span>)}
        {(guide.methods?.length ?? 0) > 1 && <span style={{ fontSize: 10, color: C.accent, padding: "2px 7px", borderRadius: 2, border: `1px solid ${C.accentDim}`, fontFamily: "monospace" }}>{guide.methods!.length} methods</span>}
        {(guide.requires?.length ?? 0) > 0 && <span style={{ fontSize: 10, color: C.warn, padding: "2px 7px", borderRadius: 2, border: `1px solid ${C.warn}33`, fontFamily: "monospace" }}>{guide.requires!.length} prereq{guide.requires!.length > 1 ? "s" : ""}</span>}
      </div>
    </article>
  );
}

// ─── GUIDE DETAIL MODAL ───────────────────────────────────────
function GuideDetail({ guideId, onClose, isMobile, user }: { guideId: string; onClose: () => void; isMobile: boolean; user: User | null }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeMethod, setActiveMethod] = useState(0);
  const { count, voted, toggle } = useUpvote(guideId, guide?.upvotes ?? 0, user?.id);

  useEffect(() => {
    dbGetGuide(guideId).then(g => g && setGuide(g));
  }, [guideId]);

  if (!guide) return (
    <Modal open onClose={onClose} isMobile={isMobile} maxWidth={680}>
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={24} color={C.accent} /></div>
    </Modal>
  );

  const m = LEVEL_META[guide.level];
  return (
    <Modal open onClose={onClose} isMobile={isMobile} maxWidth={680} accentColor={m.color}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <LevelBadge level={guide.level} size="md" />
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>{guide.niche.toUpperCase()} · {m.name}</span>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
      </div>

      <h2 style={{ fontFamily: "'Georgia',serif", fontSize: isMobile ? 19 : 23, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{guide.title}</h2>
      <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>{guide.description}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[{ label: "UPVOTES", val: count }, { label: "VERIFIERS", val: guide.verifier_count }, { label: "METHODS", val: guide.methods?.length ?? 0 }].map(({ label, val }) => (
          <div key={label} style={{ flex: 1, padding: isMobile ? "10px 6px" : 12, border: `1px solid ${C.border}`, borderRadius: 4, textAlign: "center" }}>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{val}</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <Tabs tabs={[{ id: "overview", label: "Overview" }, { id: "methods", label: `Methods (${guide.methods?.length ?? 0})` }, { id: "materials", label: "Materials" }]} active={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: 18, marginBottom: 20, minHeight: 120 }}>
        {activeTab === "overview" && (
          <div>
            {(guide.requires?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.warn, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>PREREQUISITES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {guide.requires!.map(rid => <div key={rid} style={{ padding: "8px 12px", border: `1px solid ${C.warn}22`, borderRadius: 4, background: `${C.warn}08`, fontSize: 12, color: C.dim, fontFamily: "monospace" }}>{rid}</div>)}
                </div>
              </div>
            )}
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.8, fontFamily: "'Georgia',serif", whiteSpace: "pre-wrap" }}>
              {guide.content.replace(/^#.+\n/m, "").trim()}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {guide.tags.map(t => <span key={t} style={{ fontSize: 10, color: C.muted, padding: "2px 7px", borderRadius: 2, border: `1px solid ${C.border}`, fontFamily: "monospace" }}>#{t}</span>)}
            </div>
          </div>
        )}

        {activeTab === "methods" && guide.methods && (
          <div>
            {guide.methods.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {guide.methods.map((method, i) => (
                  <button key={method.id} onClick={() => setActiveMethod(i)}
                    style={{ padding: "5px 12px", borderRadius: 3, border: `1px solid ${activeMethod === i ? C.accent : C.border}`, background: activeMethod === i ? C.accentGlow : "none", color: activeMethod === i ? C.accent : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace" }}>
                    {method.title}
                  </button>
                ))}
              </div>
            )}
            {guide.methods[activeMethod] && (
              <div>
                <h4 style={{ fontSize: 14, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 6 }}>{guide.methods[activeMethod].title}</h4>
                <p style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.7 }}>{guide.methods[activeMethod].description}</p>
                <ol style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {guide.methods[activeMethod].steps.map((step, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${C.accent}44`, background: `${C.accent}11`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.accent, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontFamily: "'Georgia',serif", paddingTop: 3 }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {activeTab === "materials" && (
          guide.materials && guide.materials.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {guide.materials.map(mat => (
                <div key={mat.id} style={{ padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3, fontFamily: "'Georgia',serif" }}>{mat.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>{mat.description}</div>
                    {mat.optional && <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>optional</span>}
                  </div>
                  {mat.rating && <div style={{ fontSize: 12, color: C.warn, fontFamily: "monospace", flexShrink: 0 }}>★ {mat.rating}</div>}
                </div>
              ))}
            </div>
          ) : <EmptyState icon="🔧" title="No materials listed" body="This guide doesn't list specific materials, or they are described within the method steps." />
        )}
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        {user ? (
          <Button onClick={toggle} variant={voted ? "primary" : "ghost"} style={{ minWidth: 100 }}>
            {voted ? "▲ Voted" : "▲ Upvote"}
          </Button>
        ) : (
          <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>Sign in to upvote</span>
        )}
        <Button variant="ghost" onClick={onClose} style={{ marginLeft: "auto" }}>Close</Button>
      </div>
    </Modal>
  );
}

// ─── GUIDE EDITOR ─────────────────────────────────────────────
const BLANK_METHOD = (): Omit<Method, "id" | "guide_id"> => ({ title: "", description: "", steps: [""], sort_order: 0 });

function GuideEditor({ open, onClose, isMobile, user, onSuccess }: { open: boolean; onClose: () => void; isMobile: boolean; user: User; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState(NICHES[0].name);
  const [level, setLevel] = useState<Level>(1);
  const [content, setContent] = useState("");
  const [methods, setMethods] = useState([BLANK_METHOD()]);
  const [materials] = useState<Omit<Material, "id" | "guide_id">[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [requires] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user.standing < STANDING.MIN_TO_SUBMIT) return (
    <Modal open={open} onClose={onClose} isMobile={isMobile} maxWidth={440}>
      <EmptyState icon="⚡" title="Standing too low" body={`Your standing (${user.standing}) is below the minimum (${STANDING.MIN_TO_SUBMIT}) required to submit guides.`} action={<Button onClick={onClose} variant="ghost">Close</Button>} />
    </Modal>
  );

  const validate = (s: 1 | 2 | 3) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (title.length < 5) e.title = "Title must be at least 5 characters";
      if (description.length < 20) e.description = "Description must be at least 20 characters";
    }
    if (s === 2) {
      if (content.length < 50) e.content = "Content must be at least 50 characters";
      methods.forEach((m, i) => { if (!m.title.trim()) e[`mt${i}`] = "Method title required"; });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate(3)) return;
    setSubmitting(true);
    try {
      const guide = await dbCreateGuide({ title, description, niche, level, content, tags, author_id: user.id });
      await Promise.all([
        dbSaveMethods(guide.id, methods.map((m, i) => ({ ...m, sort_order: i }))),
        dbSaveMaterials(guide.id, materials.map((m, i) => ({ ...m, sort_order: i }))),
        dbSavePrerequisites(guide.id, requires),
      ]);
      await dbSubmitGuide(guide.id);
      onSuccess();
      onClose();
    } catch (e: any) {
      setErrors({ submit: e.message });
    }
    setSubmitting(false);
  };

  const updateMethod = (i: number, field: keyof typeof methods[0], value: string | string[]) =>
    setMethods(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const inp = { background: "#0d0d0d", border: `1px solid ${C.border}`, borderRadius: 4, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: "'Georgia',serif", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <Modal open={open} onClose={onClose} isMobile={isMobile} maxWidth={700} title="Submit Guide" accentColor={C.accent}>
      {/* Step indicators */}
      <div style={{ display: "flex", marginBottom: 24, gap: 0 }}>
        {["Metadata", "Content", "Review"].map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3;
          const active = step === s; const done = step > s;
          return (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
              {i < 2 && <div style={{ position: "absolute", top: 10, left: "50%", width: "100%", height: 1, background: done ? C.accent : C.border, zIndex: 0 }} />}
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${active || done ? C.accent : C.border}`, background: done ? C.accent : active ? C.accentGlow : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: done ? "#000" : active ? C.accent : C.muted, fontFamily: "monospace", fontWeight: 700, zIndex: 1 }}>
                {done ? "✓" : s}
              </div>
              {!isMobile && <span style={{ fontSize: 9, color: active ? C.accent : C.muted, fontFamily: "monospace" }}>{label.toUpperCase()}</span>}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Title" value={title} onChange={setTitle} required error={errors.title} placeholder="How to build a half-adder circuit" maxLength={200} />
          <Input label="Description" value={description} onChange={setDescription} required multiline rows={3} maxLength={500} placeholder="What will the reader be able to do after completing this guide?" error={errors.description} />
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
            <Select label="Niche" value={niche} onChange={setNiche} options={NICHES.map(n => ({ value: n.name, label: n.name }))} required />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>LEVEL *</div>
              <div style={{ display: "flex", gap: 6 }}>
                {([1, 2, 3, 4] as Level[]).map(l => (
                  <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l}
                    style={{ flex: 1, padding: "9px 0", background: level === l ? `${LEVEL_META[l].color}22` : "none", border: `1px solid ${level === l ? LEVEL_META[l].color : C.border}`, color: level === l ? LEVEL_META[l].color : C.muted, borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>
                    L{l}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>{LEVEL_META[level].desc}</div>
            </div>
          </div>
          <TagInput tags={tags} onChange={setTags} />
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Input label="Guide Content (Markdown)" value={content} onChange={setContent} multiline rows={6} placeholder="Write the guide content here. Use markdown. Include theory, context, safety notes." error={errors.content} hint={`${content.length} chars`} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>METHODS ({methods.length})</span>
              <button onClick={() => setMethods(p => [...p, BLANK_METHOD()])} style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}`, color: C.accent, borderRadius: 3, padding: "4px 10px", cursor: "pointer", fontSize: 10, fontFamily: "monospace" }}>+ ADD METHOD</button>
            </div>
            {methods.map((m, mi) => (
              <div key={mi} style={{ padding: 14, border: `1px solid ${C.borderBright}`, borderRadius: 5, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: C.accent, fontFamily: "monospace" }}>METHOD {mi + 1}</span>
                  {methods.length > 1 && <button onClick={() => setMethods(p => p.filter((_, i) => i !== mi))} style={{ background: "none", border: "none", color: C.error, cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>REMOVE</button>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={m.title} onChange={e => updateMethod(mi, "title", e.target.value)} placeholder="Method title" style={inp} />
                  <input value={m.description} onChange={e => updateMethod(mi, "description", e.target.value)} placeholder="Brief description" style={inp} />
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginBottom: 6 }}>STEPS</div>
                    {m.steps.map((s, si) => (
                      <div key={si} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.accent}44`, background: `${C.accent}11`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.accent, fontFamily: "monospace", flexShrink: 0 }}>{si + 1}</span>
                        <input value={s} onChange={e => updateMethod(mi, "steps", m.steps.map((x, xi) => xi === si ? e.target.value : x))} placeholder={`Step ${si + 1}`} style={{ ...inp, flex: 1 }} />
                        {m.steps.length > 1 && <button onClick={() => updateMethod(mi, "steps", m.steps.filter((_, xi) => xi !== si))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>×</button>}
                      </div>
                    ))}
                    <button onClick={() => updateMethod(mi, "steps", [...m.steps, ""])} style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 4, padding: "5px 12px", color: C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace", width: "100%", marginTop: 4 }}>+ ADD STEP</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "14px 16px", border: `1px solid ${C.border}`, borderRadius: 5 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <LevelBadge level={level} /><span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{niche.toUpperCase()}</span>
            </div>
            <h3 style={{ fontSize: 16, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 4 }}>{title || "—"}</h3>
            <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 10 }}>{description || "—"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map(t => <span key={t} style={{ fontSize: 10, color: C.accent, padding: "2px 7px", borderRadius: 2, border: `1px solid ${C.accentDim}`, fontFamily: "monospace" }}>#{t}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ label: "METHODS", val: methods.length }, { label: "STEPS", val: methods.reduce((a, m) => a + m.steps.length, 0) }, { label: "CHARS", val: content.length }].map(({ label, val }) => (
              <div key={label} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 4, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: C.text }}>{val}</div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 14px", background: `${C.warn}08`, border: `1px solid ${C.warn}22`, borderRadius: 4, fontSize: 11, color: C.warn, lineHeight: 1.6 }}>
            Your guide will enter the verification queue. A randomly selected panel of {VERIFICATION.MIN_VERIFIERS}–{VERIFICATION.MAX_VERIFIERS} qualified Verifiers will review and vote. You'll receive their written feedback within {VERIFICATION.DEADLINE_DAYS} days.
          </div>
          {errors.submit && <div style={{ fontSize: 12, color: C.error }}>{errors.submit}</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        {step > 1 && <Button onClick={() => setStep(s => (s - 1) as any)} variant="ghost">← Back</Button>}
        <div style={{ flex: 1 }} />
        {step < 3
          ? <Button onClick={() => { if (validate(step)) setStep(s => (s + 1) as any); }}>Continue →</Button>
          : <Button onClick={handleSubmit} loading={submitting}>Submit for Verification →</Button>}
      </div>
    </Modal>
  );
}

// ─── PAGES ────────────────────────────────────────────────────

function ExplorePage({ user, isMobile, isTablet, onSubmitClick }: { user: User | null; isMobile: boolean; isTablet: boolean; onSubmitClick: () => void }) {
  const { filter, setNiche, setLevel, setSearch } = useGuideFilter();
  const { guides, loading, error } = useGuides(filter);
  const [selected, setSelected] = useState<string | null>(null);
  const px = isMobile ? 16 : 32;

  return (
    <>
      <section style={{ padding: isMobile ? "28px 16px 22px" : "48px 32px 36px", borderBottom: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle,${C.accentGlow} 0%,transparent 70%)`, pointerEvents: "none" }} />
        <div>
          <p style={{ fontSize: isMobile ? 9 : 10, color: C.accent, fontFamily: "monospace", letterSpacing: isMobile ? 2 : 3, marginBottom: 10 }}>BROADLEARNING UNIVERSAL EDUCATION SYSTEM</p>
          <h1 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.5 }}>
            Learn how to do <span style={{ color: C.accent }}>anything.</span>
          </h1>
          <p style={{ color: C.dim, fontSize: isMobile ? 12 : 13, lineHeight: 1.8, maxWidth: 480, marginBottom: 22 }}>
            A free, hierarchical, community-verified knowledge base. Not facts — guides for <em>doing</em> things.
          </p>
          <div style={{ maxWidth: 480, position: "relative" }}>
            <span aria-hidden style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14, pointerEvents: "none" }}>⌕</span>
            <input type="search" value={filter.search} onChange={e => setSearch(e.target.value)} placeholder="Search guides…"
              aria-label="Search guides"
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 5, padding: "11px 14px 11px 36px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Georgia',serif" }} />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div style={{ borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", padding: `12px ${px}px`, minWidth: "max-content" }}>
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginRight: 2 }}>NICHE:</span>
          {["All", ...NICHES.map(n => n.name)].map(n => (
            <button key={n} onClick={() => setNiche(n)} aria-pressed={filter.niche === n}
              style={{ padding: "5px 11px", borderRadius: 3, border: `1px solid ${filter.niche === n ? C.accent : C.border}`, background: filter.niche === n ? C.accentGlow : "none", color: filter.niche === n ? C.accent : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, whiteSpace: "nowrap" }}>
              {n.toUpperCase()}
            </button>
          ))}
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", letterSpacing: 1, marginLeft: 8, marginRight: 2 }}>LVL:</span>
          {([1, 2, 3, 4] as Level[]).map(l => (
            <button key={l} onClick={() => setLevel(l)} aria-pressed={filter.level === l}
              style={{ padding: "5px 10px", borderRadius: 3, border: `1px solid ${filter.level === l ? LEVEL_META[l].color : C.border}`, background: filter.level === l ? `${LEVEL_META[l].color}11` : "none", color: filter.level === l ? LEVEL_META[l].color : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace" }}>
              L{l}
            </button>
          ))}
        </div>
      </div>

      <main style={{ padding: `18px ${px}px`, paddingBottom: isMobile ? 88 : 40 }}>
        {error && <div style={{ color: C.error, fontSize: 12, marginBottom: 16 }}>Error: {error}</div>}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(300px,1fr))", gap: isMobile ? 10 : 12 }}>
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : guides.length === 0 ? (
          <EmptyState icon="◌" title="No guides found" body="Try adjusting your filters. You can also be the first to contribute in this area." action={user ? <Button onClick={onSubmitClick} variant="secondary" size="sm">Submit a Guide</Button> : undefined} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(300px,1fr))", gap: isMobile ? 10 : 12 }}>
            {guides.map(g => <GuideCard key={g.id} guide={g} onClick={g => setSelected(g.id)} isMobile={isMobile} />)}
          </div>
        )}
      </main>
      {selected && <GuideDetail guideId={selected} onClose={() => setSelected(null)} isMobile={isMobile} user={user} />}
    </>
  );
}

function HierarchyPage({ isMobile }: { isMobile: boolean }) {
  const px = isMobile ? 16 : 32;
  return (
    <main style={{ padding: isMobile ? `28px ${px}px 88px` : `48px ${px}px 40px`, maxWidth: 700 }}>
      <p style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", letterSpacing: 3, marginBottom: 14 }}>THE HIERARCHY OF KNOWLEDGE</p>
      <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.8, marginBottom: 32 }}>
        Every guide in BLUE belongs to a level. Higher levels depend on lower ones. Start at Level 1 and reach any level without gaps — this is enforced by the Verifier system.
      </p>
      {([1, 2, 3, 4] as Level[]).map((l, i) => {
        const m = LEVEL_META[l];
        return (
          <div key={l} style={{ display: "flex", gap: isMobile ? 14 : 20, alignItems: "flex-start", padding: "22px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 6, flexShrink: 0, border: `2px solid ${m.color}44`, background: `${m.color}11`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 13 : 16, fontWeight: 900, color: m.color, fontFamily: "monospace" }}>L{l}</div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Georgia',serif" }}>{m.name}</h2>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 4 }}>{m.desc}</p>
              <LevelBadge level={l} size="xs" />
            </div>
          </div>
        );
      })}
    </main>
  );
}

function VerifyPage({ isMobile, user, onLoginPrompt }: { isMobile: boolean; user: User | null; onLoginPrompt: () => void }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("system");
  const px = isMobile ? 16 : 32;

  useEffect(() => {
    if (!user || user.role === "user") return;
    dbGetVerifierQueue(user.id).then(setQueue).catch(() => {});
  }, [user]);

  const steps = [
    { title: "Submission", desc: "User submits guide with methodology, sources, and methods. Standing check performed." },
    { title: "Jury Selection", desc: `${VERIFICATION.MIN_VERIFIERS}–${VERIFICATION.MAX_VERIFIERS} qualified Verifiers randomly selected for the niche and level.` },
    { title: "Review & Vote", desc: `Each Verifier reads the full guide, votes approve or reject. Written reasoning mandatory (min ${VERIFICATION.MIN_REASONING_CHARS} chars).` },
    { title: "Feedback Loop", desc: "Submitter receives all Verifier reasoning regardless of outcome. Majority vote decides." },
    { title: "Appeal", desc: "Rejected guides can be appealed once by users in good standing. New panel selected." },
    { title: "Dispute", desc: "Any user in good standing can dispute an approved guide. Panel votes to keep, move, or spin off." },
  ];

  return (
    <main style={{ padding: isMobile ? `28px ${px}px 88px` : `48px ${px}px 40px`, maxWidth: 800 }}>
      <p style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", letterSpacing: 3, marginBottom: 14 }}>THE VERIFIER SYSTEM</p>
      <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
        {[["system", "HOW IT WORKS"], ["queue", "MY QUEUE"], ["qualify", "GET QUALIFIED"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ background: "none", border: "none", color: activeTab === id ? C.accent : C.muted, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, padding: "10px 16px", borderBottom: activeTab === id ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "system" && (
        <div>
          <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.8, marginBottom: 28 }}>
            Anyone can submit. Not anyone can verify. Verifiers are randomly selected from tested experts. All votes require written explanation. Majority rules.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 16, paddingBottom: 20, paddingTop: i > 0 ? 20 : 0, borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "monospace", marginTop: 2 }}>{i + 1}</div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4, fontFamily: "'Georgia',serif" }}>{s.title}</h3>
                  <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "queue" && (
        user ? (
          user.role === "user" ? (
            <EmptyState icon="⚖️" title="Verifier access required" body="Pass qualification tests to join the verifier pool and access the queue." />
          ) : queue.length === 0 ? (
            <EmptyState icon="✓" title="Queue empty" body="No pending verifications. You'll be notified when selected for a new panel." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {queue.map(session => (
                <div key={session.id} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 18px", background: C.surface }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <LevelBadge level={session.level} />
                    <span style={{ fontSize: 10, color: C.warn, fontFamily: "monospace" }}>DUE {new Date(session.deadline).toLocaleDateString()}</span>
                  </div>
                  <h4 style={{ fontSize: 14, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 6 }}>{session.title}</h4>
                  <Button size="sm">Open & Vote</Button>
                </div>
              ))}
            </div>
          )
        ) : <EmptyState icon="🔒" title="Sign in to access your queue" body="" action={<Button onClick={onLoginPrompt} variant="secondary">Sign In</Button>} />
      )}

      {activeTab === "qualify" && (
        user ? (
          <div style={{ padding: "20px", border: `1px solid ${C.accent}33`, borderRadius: 6, background: C.accentGlow }}>
            <div style={{ fontSize: 11, color: C.accent, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>BECOME A VERIFIER</div>
            <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 16 }}>Pass the qualification test for a niche and level to join the verifier pool. Higher levels require passing all lower tests first.</p>
            <Button>Start Qualification Test →</Button>
          </div>
        ) : <EmptyState icon="🏅" title="Sign in to qualify" body="" action={<Button onClick={onLoginPrompt} variant="secondary">Sign In</Button>} />
      )}
    </main>
  );
}

function AboutPage({ isMobile }: { isMobile: boolean }) {
  const px = isMobile ? 16 : 32;
  const [stats, setStats] = useState({ guides: 0, users: 0, niches: 0 });
  useEffect(() => {
    dbStats().then(setStats).catch(() => {});
  }, []);

  return (
    <main style={{ padding: isMobile ? `28px ${px}px 88px` : `48px ${px}px 40px`, maxWidth: 680 }}>
      <p style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", letterSpacing: 3, marginBottom: 20 }}>ABOUT BLUE</p>
      <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.25, marginBottom: 12, letterSpacing: -0.5 }}>
        The free how-to guide for <span style={{ color: C.accent }}>everything.</span>
      </h1>

      {/* Live stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 36, padding: "16px 20px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface }}>
        {[{ label: "APPROVED GUIDES", val: stats.guides }, { label: "MEMBERS", val: stats.users }, { label: "NICHES", val: stats.niches }].map(({ label, val }) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: C.text }}>{val}</div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {[
        { title: "The Problem", body: "Information online is scattered and unusable. Wikipedia gives facts. WikiHow scratches the surface. AI truncates and hallucinates. None give you a complete, verified, hierarchical path from zero to expert execution." },
        { title: "The Solution", body: "BLUE organizes knowledge around doing, not knowing. Every guide teaches you how to perform a specific task. Guides are tiered by complexity so you always know what to learn first." },
        { title: "Local-First Architecture", body: "BLUE runs entirely in your browser using PGlite — a full PostgreSQL engine compiled to WebAssembly. Your data lives in IndexedDB. No server required. When you're ready to sync, export to JSON and import to Supabase." },
        { title: "Open Knowledge", body: "Free forever. No paywalls, no ads on content, no algorithm. Community-created, community-verified, community-governed." },
      ].map((s, i) => (
        <div key={i} style={{ paddingBottom: 28, paddingTop: i > 0 ? 28 : 0, borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Georgia',serif", marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.8 }}>{s.body}</p>
        </div>
      ))}

    </main>
  );
}

// ─── HEADER ───────────────────────────────────────────────────
function Header({ isMobile, user, onLogin, onLogout, onRegister, authLoading, notifCount, onNotifClick, onSubmitClick, authOpen, onAuthOpen, onAuthClose }: any) {
  const location = useLocation();

  const navLinks: [string, string][] = [["/", "EXPLORE"], ["/hierarchy", "HIERARCHY"], ["/verify", "VERIFY"], ["/about", "ABOUT"]];

  return (
    <>
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: isMobile ? "0 16px" : "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 50 : 56, position: "sticky", top: 0, zIndex: 100, background: C.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 32 }}>
          <Link to="/" aria-label="BLUE home" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: isMobile ? 26 : 28, height: isMobile ? 26 : 28, borderRadius: 4, background: `linear-gradient(135deg,${C.accent},#2266cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#000", fontFamily: "monospace" }}>B</div>
            <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace", color: C.text }}>BLUE</span>
          </Link>
          {!isMobile && (
            <nav>
              {navLinks.map(([href, label]) => {
                const active = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
                return (
                  <Link key={href} to={href}
                    style={{ color: active ? C.accent : C.muted, textDecoration: "none", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, padding: "0 14px", height: 56, display: "inline-flex", alignItems: "center", borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent" }}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <>
              <button onClick={onNotifClick} aria-label={`Notifications${notifCount > 0 ? `, ${notifCount} unread` : ""}`}
                style={{ position: "relative", background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px", cursor: "pointer", color: C.muted, fontSize: 15 }}>
                🔔
                {notifCount > 0 && <span aria-hidden style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: C.accent, color: "#000", fontSize: 9, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
              </button>
              {!isMobile && <Button onClick={onSubmitClick} variant="secondary" size="sm">+ SUBMIT GUIDE</Button>}
              <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px", cursor: "pointer", color: C.text, fontSize: 11, fontFamily: "monospace" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accentGlow, border: `1px solid ${C.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.accent, fontWeight: 700 }}>
                  {user.username[0].toUpperCase()}
                </div>
                {!isMobile && user.username}
              </button>
            </>
          ) : (
            <>
              {!isMobile && <Button onClick={onSubmitClick} variant="secondary" size="sm">+ SUBMIT GUIDE</Button>}
              <Button onClick={onAuthOpen} size="sm" variant="ghost">Sign In</Button>
            </>
          )}
        </div>
      </header>
      {/* Auth modal inline */}
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={onAuthClose}
          isMobile={isMobile}
          onLogin={onLogin}
          onRegister={onRegister}
          loading={authLoading}
        />
      )}
    </>
  );
}

// Import AuthModal inline to avoid circular dep
import { AuthModal } from "./components/auth/AuthModal";
import { NotificationPanel } from "./components/notifications/NotificationCenter";

// ─── MOBILE NAV ───────────────────────────────────────────────
function MobileNav({ onSubmit }: { onSubmit: () => void }) {
  const location = useLocation();
  const tabs: [string, string, string][] = [["/", "⊞", "EXPLORE"], ["/hierarchy", "≡", "LEVELS"], ["/verify", "✓", "VERIFY"], ["/about", "◎", "ABOUT"]];
  return (
    <nav aria-label="Mobile navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#0f0f0f", borderTop: `1px solid ${C.border}`, display: "flex" }}>
      {tabs.map(([href, icon, label]) => {
        const active = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
        return (
          <Link key={href} to={href} aria-current={active ? "page" : undefined}
            style={{ flex: 1, padding: "10px 0 8px", color: active ? C.accent : C.muted, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative" }}>
            {active && <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, background: C.accent, borderRadius: 1 }} />}
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span style={{ fontSize: 8, fontFamily: "monospace", letterSpacing: 0.5 }}>{label}</span>
          </Link>
        );
      })}
      <button onClick={onSubmit} style={{ flex: 1, padding: "10px 0 8px", background: "none", border: "none", color: C.accent, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
        <span style={{ fontSize: 8, fontFamily: "monospace" }}>SUBMIT</span>
      </button>
    </nav>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
function AppInner() {
  const { isMobile, isTablet } = useBreakpoint();
  const { user, loading: authLoading, login, logout, register } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [headerAuthOpen, setHeaderAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Close any open auth modal as soon as the user is authenticated
  useEffect(() => {
    if (user) {
      setAuthPromptOpen(false);
      setHeaderAuthOpen(false);
    }
  }, [user]);

  const onSubmitClick = () => {
    if (!user) { setAuthPromptOpen(true); return; }
    setShowSubmit(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Georgia',serif" }}>
      <Header isMobile={isMobile} user={user} onLogin={login} onLogout={logout} onRegister={register} authLoading={authLoading} notifCount={unreadCount} onNotifClick={() => setShowNotifs(o => !o)} onSubmitClick={onSubmitClick} authOpen={headerAuthOpen} onAuthOpen={() => setHeaderAuthOpen(true)} onAuthClose={() => setHeaderAuthOpen(false)} />

      <Routes>
        <Route path="/" element={<ExplorePage user={user} isMobile={isMobile} isTablet={isTablet} onSubmitClick={onSubmitClick} />} />
        <Route path="/hierarchy" element={<HierarchyPage isMobile={isMobile} />} />
        <Route path="/verify" element={<VerifyPage isMobile={isMobile} user={user} onLoginPrompt={() => setAuthPromptOpen(true)} />} />
        <Route path="/about" element={<AboutPage isMobile={isMobile} />} />
      </Routes>

      {isMobile && <MobileNav onSubmit={onSubmitClick} />}

      {showNotifs && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowNotifs(false)} />
          <div style={{ position: "fixed", top: isMobile ? undefined : 64, bottom: isMobile ? 0 : undefined, right: isMobile ? 0 : 16, zIndex: 150, width: isMobile ? "100%" : 360 }}>
            <NotificationPanel notifications={notifications} unreadCount={unreadCount} onMarkRead={markRead} onMarkAllRead={markAllRead} isMobile={isMobile} onClose={() => setShowNotifs(false)} />
          </div>
        </>
      )}

      {showSubmit && user && (
        <GuideEditor open={showSubmit} onClose={() => setShowSubmit(false)} isMobile={isMobile} user={user}
          onSuccess={() => setToast({ message: "Guide submitted for verification! You'll hear back within 7 days.", type: "success" })} />
      )}

      {authPromptOpen && (
        <AuthModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} isMobile={isMobile}
          onLogin={login}
          onRegister={register}
          loading={authLoading} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
