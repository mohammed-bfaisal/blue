import type { Level } from "../types";

export const C = {
  bg: "#0a0a0a", surface: "#111111", surfaceHover: "#161616",
  border: "#1e1e1e", borderBright: "#2a2a2a",
  accent: "#4a9eff", accentDim: "#1a3a5c", accentGlow: "rgba(74,158,255,0.12)",
  text: "#e8e8e8", muted: "#666", dim: "#999",
  l1: "#4aff91", l2: "#4a9eff", l3: "#a04aff", l4: "#ff4a91",
  warn: "#ffaa4a", error: "#ff4a4a", success: "#4aff91",
} as const;

export const LEVEL_META: Record<Level, { label: string; color: string; name: string; desc: string }> = {
  1: { label: "L1", color: C.l1, name: "Foundational", desc: "No prerequisites. Completable with zero prior knowledge." },
  2: { label: "L2", color: C.l2, name: "Intermediate", desc: "Requires relevant L1 guides. Combines concepts into functional systems." },
  3: { label: "L3", color: C.l3, name: "Advanced", desc: "Requires L1 and L2. Complex integration toward a working whole." },
  4: { label: "L4", color: C.l4, name: "Expert", desc: "Full prerequisite chain required. Edge cases and professional-grade execution." },
};

export const NICHES = [
  { name: "Electronics", slug: "electronics", description: "Circuits, components, embedded systems" },
  { name: "Medicine", slug: "medicine", description: "Clinical practice, diagnostics, pharmacology" },
  { name: "Construction", slug: "construction", description: "Structural work, materials, trades" },
  { name: "Mathematics", slug: "mathematics", description: "Pure and applied mathematical systems" },
  { name: "Mechanics", slug: "mechanics", description: "Engines, drivetrains, mechanical systems" },
  { name: "Chemistry", slug: "chemistry", description: "Reactions, synthesis, lab technique" },
  { name: "Programming", slug: "programming", description: "Software systems, algorithms, architecture" },
  { name: "Agriculture", slug: "agriculture", description: "Farming, soil, irrigation, crops" },
];

export const STANDING = {
  MIN_TO_SUBMIT: 60, MIN_TO_DISPUTE: 70,
  MIN_TO_APPEAL: 50, STRIKE_PENALTY: 10, MAX: 100, MIN: 0,
} as const;

export const VERIFICATION = {
  MIN_VERIFIERS: 3, MAX_VERIFIERS: 7,
  DEADLINE_DAYS: 7, MIN_REASONING_CHARS: 100,
} as const;

export const BP = { xs: 480, sm: 768, md: 1024, lg: 1280 } as const;
