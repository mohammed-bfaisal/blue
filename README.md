# BLUE — Broadlearning Universal Education System

> A free, open-source, hierarchical knowledge base for *doing* things — not just knowing about them.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Issues](https://img.shields.io/github/issues/mohammed-bfaisal/blue)](https://github.com/mohammed-bfaisal/blue/issues)

---

## What is BLUE?

The internet has infinite information but no structure. Wikipedia tells you *about* things. WikiHow tops out at "how to fix your toaster." Khan Academy relies on a handful of experts. AI hallucinates.

BLUE is the missing layer: a single place where anyone can learn **how to do anything** — from assembling a transistor to practicing medicine — organized into a strict hierarchy so that a complete beginner and an expert can both navigate it fluently.

Inspired by [Sebastian Rey's original vision](https://youtu.be/qcRKmm3B25c).

---

## Core Principles

| Principle | What it means |
|-----------|--------------|
| **Free, always** | No paywalls, no premium tiers. Ever. |
| **Hierarchy-first** | Every guide sits on a level. Higher levels build on lower ones. |
| **One guide per topic** | No duplicates. Multiple approaches live inside one guide via the Method System. |
| **Community-verified** | Guides are reviewed by a randomly selected jury of qualified Verifiers, not a handful of admins. |
| **Open source** | The platform itself is MIT-licensed and community-governed. |

---

## The Hierarchy System

Every guide belongs to exactly one level:

| Level | Name | Description | Example (Electronics) |
|-------|------|-------------|----------------------|
| L1 | Foundational | No prerequisites. Zero prior knowledge assumed. | How to build a transistor |
| L2 | Intermediate | Builds directly on L1 concepts. | How to wire logic gates from transistors |
| L3 | Advanced | Requires full L1 + L2 understanding. | How to build an ALU from logic gates |
| L4 | Expert | Full prerequisite chain. Professional-grade depth. | How to design a CPU instruction set |

**Rule:** Everything you need to complete an L2 guide must be taught at L1. No gaps, ever.

---

## The Verifier System

Guides don't go live until they pass a jury review:

1. User submits a guide (or modification to an existing guide)
2. The system randomly selects an **odd number of qualified Verifiers** for that niche + level
3. Each Verifier must **vote and explain their reasoning** (min 100 characters) within a time window
4. Majority wins — approved guides publish, rejected guides return to the author with full feedback
5. Published guides can be **downvoted by users** — enough downvotes triggers a re-review
6. Users in good standing can **open disputes** at any time

To become a Verifier, users pass a qualification test scoped to a specific niche and level.

---

## The Method System

When there are multiple valid ways to do something, they live **inside one guide** — not as separate articles. Each method gets its own section, can be linked to individually, and can eventually replace the default method if the community votes it up.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Database | [PGlite](https://github.com/electric-sql/pglite) — full PostgreSQL in the browser via WASM |
| Persistence | IndexedDB (no server needed in local mode) |
| Routing | React Router v7 |
| Future backend | Supabase (schema-compatible — migration is a straight data export/import) |

---

## Quick Start

```bash
git clone https://github.com/mohammed-bfaisal/blue
cd blue
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Demo accounts (local mode):**
| Email | Role |
|-------|------|
| `demo@blue.dev` | Regular user |
| `verifier@blue.dev` | Verifier |

> Password: any string works in local mode — no real auth until Supabase is wired up.

---

## Project Structure

```
blue/
├── src/
│   ├── components/
│   │   ├── ui/            # Shared primitives (Button, Input, Modal, Badge)
│   │   ├── auth/          # Login / register modal, user menu
│   │   ├── guides/        # Guide card, detail modal, 3-step editor wizard
│   │   ├── verifier/      # Vote form, dispute modal, verifier queue
│   │   ├── notifications/ # Notification center + bell
│   │   └── layout/        # Header, nav, page shell
│   ├── hooks/             # useAuth, useGuides, useUpvote, useNotifications
│   ├── lib/
│   │   ├── db.ts          # PGlite client — all SQL queries, migrations, seed data
│   │   └── constants.ts   # Level metadata, niche list, design tokens
│   ├── pages/             # Route-level page components
│   └── types/             # TypeScript interfaces
├── schema.sql             # Supabase-compatible PostgreSQL schema (identical to PGlite)
├── CONTRIBUTING.md
└── ROADMAP.md
```

---

## Migrating to Supabase

When you're ready to go multi-user:

1. Create a Supabase project
2. Run `schema.sql` in the SQL editor
3. In BLUE → About → **Export All Data** → download JSON
4. Import via Supabase dashboard
5. Set env vars:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

Short version:
- Browse [open issues](https://github.com/mohammed-bfaisal/blue/issues) — anything tagged `good first issue` is a solid entry point
- One concern per PR
- All PRs require a passing build (`npm run build`)

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full phased plan.

---

## License

[MIT](LICENSE) — free forever, as it should be.

---

> *"If no one even attempts to build it, then this website will never exist."* — Sebastian Rey
