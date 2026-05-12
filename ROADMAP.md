# BLUE Roadmap

This document tracks the planned evolution of the BLUE platform. Phases are ordered by priority — earlier phases unlock later ones.

Status key: ✅ Done · 🔄 In Progress · 🔲 Planned · 💡 Proposed

---

## Phase 0 — Foundation (Local-First MVP)
*Goal: A working, testable version of every core system running entirely in the browser.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 0.1 | Vite + React + TypeScript scaffold | ✅ Done | — |
| 0.2 | PGlite (PostgreSQL WASM) with IndexedDB persistence | ✅ Done | — |
| 0.3 | Guide hierarchy system (L1–L4) | ✅ Done | — |
| 0.4 | Guide submission wizard (3-step) | ✅ Done | — |
| 0.5 | Method system (multiple approaches inside one guide) | ✅ Done | — |
| 0.6 | Verifier queue + vote form with mandatory reasoning | ✅ Done | — |
| 0.7 | Dispute modal + good standing checks | ✅ Done | — |
| 0.8 | Notification center (in-app) | ✅ Done | — |
| 0.9 | Upvote / downvote system | ✅ Done | — |
| 0.10 | Full-text search with level + niche filters | ✅ Done | — |
| 0.11 | Responsive design (mobile bottom nav + desktop top nav) | ✅ Done | — |
| 0.12 | Export all data to JSON (Supabase migration prep) | ✅ Done | — |

---

## Phase 1 — Real Backend
*Goal: Multi-user. Data lives on a server, not in one person's browser.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 1.1 | Supabase project setup + schema migration | 🔲 Planned | [#1] |
| 1.2 | Real authentication (Supabase Auth — email + OAuth) | 🔲 Planned | [#2] |
| 1.3 | Server-side guide CRUD replacing PGlite calls | 🔲 Planned | [#3] |
| 1.4 | Real-time updates via Supabase Realtime (new guides, votes) | 🔲 Planned | [#4] |
| 1.5 | Email notifications (submission received, vote outcome, appeal) | 🔲 Planned | [#5] |
| 1.6 | Row-level security audit + hardening | 🔲 Planned | [#6] |

---

## Phase 2 — Verifier Engine
*Goal: The jury system works end-to-end with real qualification logic.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 2.1 | Verifier qualification tests (per niche + level) | 🔲 Planned | [#7] |
| 2.2 | Automated verifier assignment on submission | 🔲 Planned | [#8] |
| 2.3 | Vote deadline enforcement + auto-expiry | 🔲 Planned | [#9] |
| 2.4 | Multi-level verifier eligibility (pass lower tests to unlock higher) | 🔲 Planned | [#10] |
| 2.5 | Verifier standing system (lose status for unexplained votes) | 🔲 Planned | [#11] |
| 2.6 | Appeal flow (rejected guide → one appeal → senior verifier panel) | 🔲 Planned | [#12] |

---

## Phase 3 — Dispute & Governance System
*Goal: Disputes are resolved fairly without any single person having too much power.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 3.1 | Dispute categories (content accuracy, hierarchy placement, method conflict) | 🔲 Planned | [#13] |
| 3.2 | Auditor role + dispute assignment | 🔲 Planned | [#14] |
| 3.3 | Spin-off system (cross-niche guide conflict → two canonical versions) | 🔲 Planned | [#15] |
| 3.4 | Good standing score + strike system | 🔲 Planned | [#16] |
| 3.5 | Dispute spam prevention (rate limiting by standing) | 🔲 Planned | [#17] |

---

## Phase 4 — Content & Community
*Goal: Enough real content across enough niches that BLUE is genuinely useful.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 4.1 | Seed content: Electronics hierarchy (L1–L3) | 🔲 Planned | [#18] |
| 4.2 | Seed content: Computer engineering hierarchy (L1–L3) | 🔲 Planned | [#19] |
| 4.3 | User profile pages (contributions, verifier status, standing score) | 🔲 Planned | [#20] |
| 4.4 | Guide prerequisite graph visualizer | 🔲 Planned | [#21] |
| 4.5 | "Learning path" feature (follow a hierarchy from L1 → L4) | 🔲 Planned | [#22] |
| 4.6 | Guide version history + diff viewer | 🔲 Planned | [#23] |

---

## Phase 5 — Sustainability
*Goal: BLUE can fund its own infrastructure without compromising its mission.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 5.1 | Material ads system (guide-matched product links, not banner ads) | 🔲 Planned | [#24] |
| 5.2 | Dynamic product ranking by user star ratings | 🔲 Planned | [#25] |
| 5.3 | Advertiser portal (submit products, track clicks, no editorial control) | 🔲 Planned | [#26] |
| 5.4 | GitHub Sponsors + Open Collective setup | 🔲 Planned | — |
| 5.5 | Anti-manipulation: fake review detection for product ratings | 🔲 Planned | [#27] |

---

## Phase 6 — Scale & Legal
*Goal: BLUE can survive institutional pressure and scale to millions of guides.*

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 6.1 | ToS, Privacy Policy, Content Policy | 🔲 Planned | — |
| 6.2 | DMCA process + takedown response workflow | 🔲 Planned | — |
| 6.3 | Full-text search migration to dedicated index (Algolia / Typesense) | 🔲 Planned | — |
| 6.4 | CDN + edge caching for guide content | 🔲 Planned | — |
| 6.5 | Internationalization (i18n) — multi-language guide support | 💡 Proposed | — |
| 6.6 | Mobile app (React Native or PWA) | 💡 Proposed | — |

---

## Non-Goals

These are explicitly out of scope — not because they're bad ideas, but because they conflict with BLUE's core principles:

- **Paid tiers or premium content** — BLUE is free, always
- **Algorithmic feed or "recommended for you"** — guides are navigated by hierarchy, not engagement metrics
- **Advertising unrelated to guide content** — ads only appear on guides where the product is directly relevant
- **Centralized editorial control** — no single person or organization controls what gets published

---

## How to Influence the Roadmap

Open an issue. Explain the problem you're solving, not just the feature you want. Roadmap items that get strong community engagement move up.
