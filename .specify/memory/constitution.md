<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR — backward-incompatible removal of the "no backend / localStorage
  only" governance rule. Supabase (Postgres + Auth) becomes a first-class dependency.
  Principle III is rewritten; Technology Constraints are rewritten. All persistence-related
  guidance changes from "client-only" to "client + Supabase backend".

Modified principles:
  I. Test-First (NON-NEGOTIABLE) — unchanged
  II. Design Fidelity — unchanged
  III. Simplicity & YAGNI — rewritten: removed "no backend"; permitted Supabase only
  IV. Component Modularity — unchanged (data-layer module clarified)
  V. Accessibility — unchanged

Added sections: none (Supabase guidance folded into Technology Constraints and Principle III)

Removed sections: none

Templates / docs requiring updates:
  ⚠ specs/001-todo-app/spec.md             — references localStorage persistence; review
  ⚠ specs/001-todo-app/plan.md             — references localStorage; needs Supabase plan
  ⚠ specs/001-todo-app/data-model.md       — needs Supabase schema + RLS policies
  ⚠ specs/001-todo-app/tasks.md            — tasks based on localStorage; regenerate
  ⚠ specs/001-todo-app/research.md         — localStorage rationale obsolete
  ⚠ specs/001-todo-app/checklists/requirements.md — may include localStorage items
  ✅ .specify/templates/plan-template.md    — generic; gate re-evaluated by /speckit-plan
  ✅ .specify/templates/spec-template.md    — generic; no edit needed
  ✅ .specify/templates/tasks-template.md   — generic; no edit needed

Follow-up TODOs:
  - Re-run /speckit-plan (or manually update specs/001-todo-app/*) to reflect Supabase
  - Define Supabase tables, RLS policies, and auth flow in data-model.md
-->

# demodev Tasks Constitution

/ 한국어 Todo 웹앱 — Claude Design 핸드오프 번들의 프로덕션 구현 (Supabase 백엔드)

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

TDD is mandatory. The cycle is strictly Red-Green-Refactor: write a failing test,
make it pass with the minimum code, then refactor.

- Pure logic — the task store and its derived selectors (`filterTasks`, `isOverdue`,
  `isToday`, `isUpcoming`, `viewCount`, `catCount`, date helpers) MUST have unit
  tests written BEFORE the implementation.
- Component behavior — interactive components (add / edit / delete / toggle-done /
  toggle-star / subtask CRUD / view switching / theme toggle) MUST have behavioral
  tests (React Testing Library) written BEFORE the component logic.
- Data layer — the Supabase access module (queries, mutations, auth helpers) MUST have
  tests written BEFORE the implementation. Tests use mocked Supabase clients or a
  local Supabase test branch; never the production project.
- A test that has never failed is not trusted. Every test MUST be observed failing
  for the right reason before its implementation is written.
- Tests are NOT optional for this project; the `/speckit-tasks` "tests optional"
  default is overridden here.

Rationale: the prototype's value lives in its filtering/grouping logic and its
interactivity. With Supabase added, persistence and auth become additional failure
surfaces — locking all three layers (logic, UI, data) with tests first prevents
regressions when the prototype's structure is restructured into production components.

### II. Design Fidelity

The Claude Design handoff bundle is the source of truth for visual output.

- Recreate the visual result pixel-faithfully: layout, spacing (4px grid), colors,
  radii, typography, and the four screens (login / main 3-panel / calendar / stats).
- The demodev design tokens (`colors_and_type.css`) MUST be used verbatim as the
  token layer — no re-derivation of color, type, radius, spacing, or shadow scales.
- The prototype's harness (DesignCanvas pan/zoom, TweaksPanel host protocol, Babel
  standalone, `window`-global module pattern) MUST NOT be carried into production —
  it is a prototyping medium, not a structure to copy.
- Both light and dark themes MUST match the design system's `[data-theme="dark"]`
  mirror.

Rationale: the README of the handoff bundle is explicit — match the visual output,
do not copy the prototype's internal structure.

### III. Simplicity & YAGNI

Build only what is specified. No speculative generality.

- Persistence is **Supabase (Postgres) only**. No `localStorage`-only fallback for
  user data, no parallel client-side store mirroring server state beyond what React
  Query / SWR-style caching naturally provides.
- No additional backends beyond Supabase. No separate Node/Express API, no
  third-party SaaS for data, auth, or storage unless the spec explicitly demands it.
- No features beyond the spec — no abstractions for single-use code, no config
  surface that was not requested, no error handling for impossible states.
- Prefer the smallest code that satisfies a passing test. If it can be 50 lines,
  it is not 200.

Rationale: the scope is a faithful, interactive reproduction of a fixed design,
persisted to a single managed backend. Extra surface area (extra services, extra
caching layers, extra fallback stores) is pure cost.

### IV. Component Modularity

Screens, shared UI, and the data layer are separated into independently testable units.

- Each screen (login, main, calendar, stats) is its own module/route.
- Shared UI (icons, side-nav, primitives like check / chip / button) lives in
  shared modules consumed by screens.
- The task store is a single module with a typed public API; components consume it,
  they do not re-implement filtering or mutation logic.
- The Supabase data layer is a single module with a typed public API
  (e.g. `getTasks`, `createTask`, `updateTask`, `deleteTask`, `signIn`, `signOut`);
  components and the task store consume it, they do not call `supabase-js` directly.
- A unit MUST be testable without mounting an unrelated screen and without hitting
  a real Supabase project.

Rationale: modular boundaries are what make Principle I's tests cheap and what
keep the four-screen scope plus a data layer from collapsing into one file.

### V. Accessibility

The production build MUST be at least as accessible as the prototype.

- Semantic HTML: real `<button>`, `<input>`, `<label>`, `<nav>`, `<aside>`,
  heading hierarchy.
- All `aria-label`s present in the prototype MUST be preserved; interactive
  controls without visible text MUST have an accessible name.
- Keyboard operability: Enter submits the add-task and add-subtask inputs; focus
  states are visible (`:focus-visible` rings from the token layer).
- Checkboxes, toggles, and radio groups expose correct roles/states.
- Auth forms MUST be keyboard-operable end to end; error messages MUST be
  announced (live region or associated `aria-describedby`).

Rationale: the prototype already encodes these affordances; regressing them in the
"real" build would be a downgrade, not a port. Auth was not in the prototype, so
its accessibility is specified explicitly here.

## Technology Constraints

- **Framework**: Next.js (App Router).
- **Language**: TypeScript — strict mode; no implicit `any` in committed code.
- **Testing**: Vitest + React Testing Library; jsdom environment. Supabase access in
  tests is mocked or pointed at a local/branch Supabase instance — never production.
- **Styling**: CSS carrying the demodev design tokens; no CSS framework that would
  re-derive the token scales.
- **Persistence**: **Supabase (Postgres)**, accessed exclusively via
  `@supabase/supabase-js`.
  - Schema lives in versioned SQL migrations under `supabase/migrations/`.
  - **Row Level Security (RLS) MUST be enabled on every user-facing table**; no
    user-facing table is exposed without at least one explicit policy.
  - Server-only secrets (service role key, etc.) MUST NOT be shipped to the client.
- **Auth**: Supabase Auth. Method (email/password, magic link, OAuth) is decided in
  the spec; this constitution does not pre-commit to one.
- **Environment**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  live in `.env.local`; `.env.local` MUST be gitignored. Service-role or any
  non-anon keys MUST NOT appear in client bundles.
- **Fonts**: Pretendard Variable + Gaegu + JetBrains Mono via the existing CDN
  `@import`s in `colors_and_type.css`.
- **Demo clock**: "today" is pinned to 2026-05-15 for relative-date logic and
  deterministic sample data, matching the prototype.

## Development Workflow

- The SDD pipeline is followed in order: constitution → specify → clarify → plan →
  tasks → analyze → implement.
- Within implementation, work proceeds task-by-task; each task that produces code
  follows Red-Green-Refactor.
- Schema changes are tasks too: every change to Supabase tables, policies, or
  functions ships as a migration file under `supabase/migrations/` in the same
  commit as the code that depends on it.
- A task is "done" only when its tests pass AND the broader suite still passes.
  Failing or partial states keep the task open.
- Commits are made per task or per logical group, with the test added in (or before)
  the same commit as the code it covers.
- The Constitution Check gate in `plan.md` MUST pass before Phase 0 research and be
  re-verified after Phase 1 design. Violations go in Complexity Tracking with a
  justification or the design changes.

## Governance

- This constitution supersedes other practices for this project. Where a tool's
  default conflicts with a principle here (e.g. "tests optional"), this document
  wins.
- Amendments require: a written rationale, a version bump per the policy below, and
  propagation to dependent templates/docs in the same change.
- Versioning policy (semantic):
  - MAJOR — backward-incompatible governance change or principle removal/redefinition.
  - MINOR — a new principle/section, or materially expanded guidance.
  - PATCH — clarifications, wording, or non-semantic refinements.
- Compliance review: every plan and task breakdown MUST be checked against these
  principles; any complexity that violates a principle MUST be justified in the
  plan's Complexity Tracking table or removed.

**Version**: 2.0.0 | **Ratified**: 2026-05-15 | **Last Amended**: 2026-05-22
