# Contributing to BLUE

Thanks for wanting to help build this. BLUE is a long-term open source project — contributions of any size matter.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Architecture Notes](#architecture-notes)

---

## Code of Conduct

Be direct. Be respectful. Disagree with ideas, not people. Contributions that are discriminatory, harassing, or made in bad faith will be removed without discussion.

---

## Ways to Contribute

### 1. Code
Pick up an issue from the [issue tracker](https://github.com/mohammed-bfaisal/blue/issues). Issues tagged `good first issue` are scoped for new contributors. Issues tagged `help wanted` are higher priority.

### 2. Bug Reports
If something is broken, [open a bug report](https://github.com/mohammed-bfaisal/blue/issues/new?template=bug_report.md). Include steps to reproduce, expected vs actual behavior, and your browser/OS.

### 3. Feature Proposals
Check the [ROADMAP](ROADMAP.md) first — if your idea is already planned, comment on the relevant issue. If it's new, [open a feature request](https://github.com/mohammed-bfaisal/blue/issues/new?template=feature_request.md).

### 4. Design & UX
If you spot something that looks wrong or feels off on mobile/desktop, open an issue with a screenshot.

### 5. Documentation
Typos, unclear explanations, missing steps — all welcome as PRs directly.

---

## Development Setup

**Requirements:** Node.js 18+, npm 9+

```bash
# Clone the repo
git clone https://github.com/mohammed-bfaisal/blue
cd blue

# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:5173

# Type check
npx tsc --noEmit

# Build
npm run build
```

**No backend needed.** The database is PGlite — PostgreSQL compiled to WASM, running entirely in the browser and persisting to IndexedDB. You don't need a Supabase account, a running server, or any environment variables to contribute.

**If you do enable Supabase:** copy `.env.example` to `.env.local` and fill in credentials from your own Supabase project. Never commit `.env.local` or share your keys — not in PRs, issues, or comments.

---

## Branch & Commit Conventions

### Branches

```
feat/short-description       # new feature
fix/short-description        # bug fix
docs/short-description       # documentation only
refactor/short-description   # no behavior change
chore/short-description      # tooling, deps, config
```

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add verifier queue pagination
fix: modal close button not firing on mobile
docs: clarify hierarchy system in README
refactor: extract guide card into own component
chore: bump pglite to 0.4.6
```

- Present tense, lowercase, no trailing period
- Keep the subject line under 72 characters
- If the change needs explanation, add a body after a blank line

---

## Pull Request Process

1. **One concern per PR.** A PR that adds a feature AND refactors unrelated code will be asked to split.
2. **Build must pass.** Run `npm run build` before opening the PR. PRs that break the build won't be merged.
3. **Type check must pass.** Run `npx tsc --noEmit` — no new TypeScript errors.
4. **Describe what and why.** The PR template has a short summary + test plan section. Fill it out.
5. **Link the issue.** If your PR resolves an open issue, add `Closes #123` in the PR body.

PRs are reviewed on a best-effort basis. If you haven't heard back in 7 days, ping in the issue thread.

---

## Issue Reporting

### Bugs

Include:
- Steps to reproduce (numbered, specific)
- What you expected to happen
- What actually happened
- Browser + OS
- Screenshot or console output if relevant

### Feature Requests

Include:
- The problem you're trying to solve (not just the solution)
- Why it fits BLUE's mission
- Any prior art or references

Requests that conflict with the core principles (free, hierarchy-first, no profit optimization) will be closed.

---

## Architecture Notes

A few things worth knowing before diving in:

**PGlite is the database.** All queries live in `src/lib/db.ts`. It's a real PostgreSQL engine — you can write real SQL. The schema in `schema.sql` is the source of truth; `db.ts` runs it on first load.

**No global state library.** State lives in custom hooks (`src/hooks/`). Each hook owns one domain (auth, guides, upvotes, notifications). Keep it that way — don't reach for Redux or Zustand.

**Component hierarchy:** `pages/` → `components/{domain}/` → `components/ui/`. Pages import domain components, domain components import UI primitives. Don't skip levels.

**Responsive breakpoints:** `sm` = 640px, `md` = 768px, `lg` = 1024px. Mobile gets a bottom nav bar; desktop gets a top nav. The `useBreakpoint()` hook is the single source of truth for layout decisions — don't use raw `window.innerWidth`.

**Future Supabase compatibility:** The PGlite schema and Supabase schema are identical. When adding a new table or column, update both `schema.sql` (for Supabase) and the migration in `db.ts` (for PGlite).

---

## Questions?

Open a [GitHub Discussion](https://github.com/mohammed-bfaisal/blue/discussions) or drop a comment on the relevant issue.
