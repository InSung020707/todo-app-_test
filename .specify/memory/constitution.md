<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Bump rationale: Initial ratification — first concrete constitution replacing the
  unfilled template. MAJOR baseline.

Modified principles:
  [PRINCIPLE_1_NAME] → I. Test-First (NON-NEGOTIABLE)
  [PRINCIPLE_2_NAME] → II. Design Fidelity
  [PRINCIPLE_3_NAME] → III. Simplicity & YAGNI
  [PRINCIPLE_4_NAME] → IV. Component Modularity
  [PRINCIPLE_5_NAME] → V. Accessibility

Added sections:
  - Technology Constraints (was [SECTION_2_NAME])
  - Development Workflow (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — generic "Constitution Check" gate, no
     edit needed; /speckit-plan fills it against these principles.
  ✅ .specify/templates/spec-template.md — generic; tests are requested explicitly
     in the spec to satisfy Principle I.
  ✅ .specify/templates/tasks-template.md — generic; tests are non-optional for
     this project per Principle I and will be requested in the spec.

Follow-up TODOs: none
-->

# demodev Tasks Constitution

/ 한국어 Todo 웹앱 — Claude Design 핸드오프 번들의 프로덕션 구현

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
- A test that has never failed is not trusted. Every test MUST be observed failing
  for the right reason before its implementation is written.
- Tests are NOT optional for this project; the `/speckit-tasks` "tests optional"
  default is overridden here.

Rationale: the prototype's value lives in its filtering/grouping logic and its
interactivity. Locking that behavior with tests first prevents regressions when the
prototype's structure is restructured into production components.

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

- No backend. Persistence is `localStorage` only; sample data seeds first run.
- No features beyond the spec — no abstractions for single-use code, no config
  surface that was not requested, no error handling for impossible states.
- Prefer the smallest code that satisfies a passing test. If it can be 50 lines,
  it is not 200.

Rationale: the scope is a faithful, interactive reproduction of a fixed design —
not a platform. Extra surface area is pure cost.

### IV. Component Modularity

Screens and shared UI are separated into independently testable units.

- Each screen (login, main, calendar, stats) is its own module/route.
- Shared UI (icons, side-nav, primitives like check / chip / button) lives in
  shared modules consumed by screens.
- The task store is a single module with a typed public API; components consume it,
  they do not re-implement filtering or mutation logic.
- A unit MUST be testable without mounting an unrelated screen.

Rationale: modular boundaries are what make Principle I's component tests cheap and
what keep the four-screen scope from collapsing into one file.

### V. Accessibility

The production build MUST be at least as accessible as the prototype.

- Semantic HTML: real `<button>`, `<input>`, `<label>`, `<nav>`, `<aside>`,
  heading hierarchy.
- All `aria-label`s present in the prototype MUST be preserved; interactive
  controls without visible text MUST have an accessible name.
- Keyboard operability: Enter submits the add-task and add-subtask inputs; focus
  states are visible (`:focus-visible` rings from the token layer).
- Checkboxes, toggles, and radio groups expose correct roles/states.

Rationale: the prototype already encodes these affordances; regressing them in the
"real" build would be a downgrade, not a port.

## Technology Constraints

- **Framework**: Next.js (App Router).
- **Language**: TypeScript — strict mode; no implicit `any` in committed code.
- **Testing**: Vitest + React Testing Library; jsdom environment.
- **Styling**: CSS carrying the demodev design tokens; no CSS framework that would
  re-derive the token scales.
- **Persistence**: `localStorage` only. No server, no database, no external API.
- **Fonts**: Pretendard Variable + Gaegu + JetBrains Mono via the existing CDN
  `@import`s in `colors_and_type.css`.
- **Demo clock**: "today" is pinned to 2026-05-15 to keep relative-date logic and
  sample data deterministic, exactly as the prototype does.

## Development Workflow

- The SDD pipeline is followed in order: constitution → specify → clarify → plan →
  tasks → analyze → implement.
- Within implementation, work proceeds task-by-task; each task that produces code
  follows Red-Green-Refactor.
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

**Version**: 1.0.0 | **Ratified**: 2026-05-15 | **Last Amended**: 2026-05-15
