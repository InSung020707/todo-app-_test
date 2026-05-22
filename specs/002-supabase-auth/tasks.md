---
description: "Tasks for feature 002-supabase-auth"
---

# Tasks: 사용자 인증과 클라우드 동기화 (Supabase Auth & Cloud Sync)

**Input**: Design documents from `/specs/002-supabase-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. 헌법 v2 Principle I (Test-First, NON-NEGOTIABLE) 및 spec의
"각 User Story별 E2E 테스트 시나리오 포함" 요구사항에 따라 모든 테스트는 Red → Green →
Refactor 순서로 구현 전 작성된다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이고 미완 의존성 없음 → 병렬 가능
- **[Story]**: US1 / US2 / US3 — Setup, Foundational, Polish 단계엔 라벨 없음
- 모든 task는 정확한 파일 경로를 포함

## Path Conventions

- Single project (Next.js App Router): `src/`, `tests/`, `supabase/migrations/` at repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 — 의존성 설치, 테스트 도구 구성.

- [X] T001 Install Supabase libs: `npm install @supabase/ssr @supabase/supabase-js`
- [X] T002 Install Playwright: `npm install -D @playwright/test` then `npx playwright install --with-deps`
- [X] T003 [P] Create `playwright.config.ts` at repo root (baseURL http://localhost:3000, projects: chromium)
- [X] T004 [P] Add `test:e2e` script to `package.json` (`"test:e2e": "playwright test"`)
- [X] T005 [P] Create `.env.example` at repo root documenting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [X] T006 [P] Verify `.env.local` is in `.gitignore` (add if missing)

**Checkpoint**: 의존성 설치 완료. `npm run dev`, `npm test`, `npx playwright test` 모두 (빈 상태로) 실행 가능.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story 가 의존하는 Supabase 클라이언트, DB 스키마, 라우팅 골격, 데이터 레이어 인터페이스.

**⚠️ CRITICAL**: 이 단계가 끝나기 전엔 어떤 US 작업도 시작 불가.

### Supabase Clients (Edge runtime 호환)

- [X] T007 [P] Create `src/lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`, exporting `getBrowserSupabase()`
- [X] T008 [P] Create `src/lib/supabase/server.ts` — `createServerClient` for Server Components / Route Handlers, exporting `getServerSupabase()`
- [X] T009 [P] Create `src/lib/supabase/middleware.ts` — helper that refreshes session cookies, exporting `updateSession(request)`
- [X] T010 Create `src/middleware.ts` (Next.js root middleware) wiring `updateSession` from T009; matcher excludes `_next/static`, `_next/image`, `favicon.ico`

### Database Schema (via Supabase MCP)

- [X] T011 Create `supabase/migrations/0001_create_tasks_table.sql` matching data-model.md (tasks table, indexes, updated_at trigger, RLS + 4 policies)
- [X] T012 Create `supabase/migrations/0002_create_subtasks_table.sql` matching data-model.md (subtasks table, index, user_id trigger, RLS + 4 policies)
- [X] T013 Apply migration 0001 to Supabase project via MCP `apply_migration` (name: `create_tasks_table`)
- [X] T014 Apply migration 0002 to Supabase project via MCP `apply_migration` (name: `create_subtasks_table`)
- [X] T015 Verify schema via MCP `execute_sql`: confirm `tasks` and `subtasks` exist in `public`, RLS enabled, 4 policies each
- [X] T016 [P] Generate TypeScript types via MCP `generate_typescript_types`, save to `src/lib/supabase/database.types.ts`

### Auth + Data Layer Contracts (skeletons)

- [X] T017 [P] Create `src/lib/data/auth.ts` skeleton — exports per `contracts/auth.md` (signUpWithPassword, signInWithPassword, signInWithGoogle, signOut, getServerUser, exchangeCodeForSession) returning `{ ok: false, error: { message: 'not implemented' } }`
- [X] T018 [P] Create `src/lib/data/tasks.ts` skeleton — exports per `contracts/tasks.md` (listTasks, createTask, updateTask, deleteTask, createSubtask, updateSubtask, deleteSubtask) returning `{ ok: false, error: { message: 'not implemented' } }`
- [X] T019 [P] Create `src/context/AuthProvider.tsx` — subscribes to `supabase.auth.onAuthStateChange`, exposes `{ user, signOut }` via `useAuth()` hook
- [X] T020 Wire `AuthProvider` into `src/app/layout.tsx` (wrap `ThemeProvider` children with `AuthProvider`)

### Route Group + Guard

- [X] T021 Create `src/app/(protected)/layout.tsx` — calls `getServerUser()`; if null, `redirect('/login')`; else renders `{children}`
- [X] T022 Move `src/app/main/` → `src/app/(protected)/main/` (preserve internals)
- [X] T023 Move `src/app/calendar/` → `src/app/(protected)/calendar/` (preserve internals)
- [X] T024 Move `src/app/stats/` → `src/app/(protected)/stats/` (preserve internals)
- [X] T025 Update `src/app/page.tsx` — server component: if session exists `redirect('/main')`, else `redirect('/login')`
- [X] T026 Create `src/app/login/page.tsx` skeleton — renders placeholder (US1 wires real forms in T046)
- [X] T027 Create `src/app/auth/callback/route.ts` skeleton — exports `GET` that returns 501 (US3 implements in T070)

**Checkpoint**: 비로그인 상태에서 `/main`, `/calendar`, `/stats` 접근 시 `/login` 으로 리다이렉트됨 (수동 확인). DB 스키마 적용 완료. 모든 User Story 작업 시작 가능.

---

## Phase 3: User Story 1 — 회원가입과 개인 할 일 관리 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 이메일/비밀번호로 가입 → 자동 로그인 → 본인 할 일 CRUD → 새로고침 후 유지 → 다른 사용자로 로그인 시 데이터 격리.

**Independent Test**: 두 개의 이메일로 가입하여 각각 다른 할 일을 추가한 뒤, 번갈아 로그인하여 자기 데이터만 보이는지 확인.

### Tests for User Story 1 (write FIRST, must FAIL before implementation)

- [X] T028 [P] [US1] Unit test: row↔domain mapping (`due: ''` ↔ `null`, snake↔camel) in `tests/unit/tasks-mapping.test.ts`
- [X] T029 [P] [US1] Unit test: `signUpWithPassword` / `signInWithPassword` happy + error paths with mocked supabase in `tests/unit/data-auth.test.ts`
- [X] T030 [P] [US1] Unit test: `listTasks` / `createTask` / `updateTask` / `deleteTask` + subtask CRUD with mocked supabase in `tests/unit/data-tasks.test.ts`
- [X] T031 [P] [US1] Component test: `SignUpForm` — renders fields, submits, shows Korean error on duplicate email, on weak password in `tests/components/SignUpForm.test.tsx`
- [X] T032 [P] [US1] Component test: `SignInForm` — renders, submits, shows error on wrong password in `tests/components/SignInForm.test.tsx`
- [X] T033 [P] [US1] Integration test: `TasksProvider` (with mocked supabase) performs full CRUD + filter/group selectors still work in `tests/integration/tasks-provider-crud.test.tsx`
- [X] T034 [P] [US1] Integration test (regression — FR-012): rendering main/calendar/stats with mocked tasks shows existing behavior unchanged in `tests/integration/existing-screens-regression.test.tsx`
- [X] T035 [P] [US1] E2E test: signup → auto-login → add/complete/star/delete task → add subtask → refresh → all persists in `tests/e2e/us1-signup-and-crud.spec.ts` (test written; runtime execution deferred — requires running dev server + Supabase test project)
- [X] T036 [P] [US1] E2E test: data isolation — user A creates task → logout → user B signs up → user B sees zero tasks of A across main/calendar/stats in `tests/e2e/us1-data-isolation.spec.ts` (test written; runtime execution deferred)

### Implementation for User Story 1

- [X] T037 [US1] Implement `src/lib/data/auth.ts` — `signUpWithPassword`, `signInWithPassword`, `signOut`, with Korean error mapping per `contracts/auth.md`. Server-only `getServerUser` and `exchangeCodeForSession` split to `src/lib/data/auth-server.ts` (with `server-only` import) so the client bundle does not import `next/headers`.
- [X] T038 [US1] Implement row↔domain mapping in `src/lib/data/tasks.ts` (`rowToTask`, `taskToInsert`, `subRowToSubtask`, `taskPatchToUpdate`)
- [X] T039 [US1] Implement `src/lib/data/tasks.ts` — `listTasks` (joins subtasks), `createTask`, `updateTask`, `deleteTask`, `createSubtask`, `updateSubtask`, `deleteSubtask`
- [X] T040 [P] [US1] Create `src/components/auth/SignUpForm.tsx` — semantic `<form>`, `<label>`, `aria-live` error region, calls `signUpWithPassword`
- [X] T041 [P] [US1] Create `src/components/auth/SignInForm.tsx` — same accessibility pattern, calls `signInWithPassword`
- [X] T042 [US1] Wire `src/app/login/page.tsx` via the refreshed `LoginScreen` to render `SignInForm` + `SignUpForm` with a mode toggle, reusing existing login screen styling
- [X] T043 [US1] Refactor `src/context/TasksProvider.tsx` — replace localStorage I/O with `src/lib/data/tasks.ts` calls; public API (method names, signatures, return shapes) IDENTICAL so existing components do not change
- [X] T044 [US1] Tasks hydrate on `TasksProvider` mount via `listTasks()`; existing `src/app/(protected)/main/page.tsx` requires no change since it just consumes `useTasks()`
- [X] T045 [US1] Run `npm test` — all 141 tests pass including 9 new US1 specs and the 122 existing regression specs
- [ ] T046 [US1] Run `npx playwright test tests/e2e/us1-*` — both US1 E2E specs (deferred; require live Supabase test project)

**Checkpoint**: User Story 1 fully functional. Friends can each sign up and manage their own tasks. **MVP deliverable.**

---

## Phase 4: User Story 2 — 인증 가드와 로그아웃 (Priority: P2)

**Goal**: 비로그인 사용자는 보호 라우트에 접근할 수 없고, 로그인된 사용자는 어디서든 로그아웃할 수 있다.

**Independent Test**: 시크릿 창에서 `/main`, `/calendar`, `/stats` 직접 접근 시 `/login` 으로 리다이렉트되는지 + 로그인 후 로그아웃 → 같은 흐름 반복.

### Tests for User Story 2 (write FIRST)

- [ ] T047 [P] [US2] Component test: `LogoutButton` calls `signOut` and navigates to `/login` in `tests/components/LogoutButton.test.tsx`
- [ ] T048 [P] [US2] E2E test: unauthenticated access to `/main`, `/calendar`, `/stats` each redirects to `/login` in `tests/e2e/us2-access-guard.spec.ts`
- [ ] T049 [P] [US2] E2E test: login → click LogoutButton → land on `/login` → revisit `/main` → still on `/login` (no auto-relogin) in `tests/e2e/us2-logout-flow.spec.ts`
- [ ] T050 [P] [US2] E2E test: session persistence — login → refresh → still logged in; close & reopen tab (same browser context) → still logged in in `tests/e2e/us2-session-persistence.spec.ts`
- [ ] T051 [P] [US2] E2E test: reverse guard — logged-in user visits `/login` → redirected to `/main` in `tests/e2e/us2-reverse-guard.spec.ts`

### Implementation for User Story 2

- [ ] T052 [US2] Create `src/components/auth/LogoutButton.tsx` — uses `useAuth().signOut`, then `router.push('/login')`
- [ ] T053 [US2] Add `LogoutButton` to the existing side-nav or header in `src/components/main/` (or wherever the nav lives) so it appears on main/calendar/stats
- [ ] T054 [US2] Implement reverse guard in `src/app/login/page.tsx` — server component: if `getServerUser()` is non-null, `redirect('/main')`
- [ ] T055 [US2] Confirm `src/app/(protected)/layout.tsx` guards all three protected routes (manual check + the E2E from T048 confirms)
- [ ] T056 [US2] Run US2 tests — all pass

**Checkpoint**: User Stories 1 AND 2 both work independently. Friend-share scenario is robust against URL-pasting and shared computers.

---

## Phase 5: User Story 3 — Google 소셜 로그인 (Priority: P3)

**Goal**: 사용자가 이메일/비밀번호 없이 Google 계정으로 1-클릭 가입/로그인할 수 있다.

**Independent Test**: 로그인 화면의 "Google로 계속하기" 버튼 → Google 인증 → 메인 진입 → 본인 할 일만 보임.

### Tests for User Story 3 (write FIRST)

- [ ] T057 [P] [US3] Unit test: `signInWithGoogle(redirectTo)` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` in `tests/unit/data-auth-oauth.test.ts`
- [ ] T058 [P] [US3] Unit test: `exchangeCodeForSession` returns ok=true on valid code, ok=false on invalid in `tests/unit/data-auth-callback.test.ts`
- [ ] T059 [P] [US3] E2E test (mocked OAuth provider or pre-seeded test user): clicking "Google로 계속하기" → returns to `/auth/callback?code=...` → lands on `/main` in `tests/e2e/us3-google-oauth.spec.ts`

### Implementation for User Story 3

- [ ] T060 [US3] Extend `src/lib/data/auth.ts` — implement `signInWithGoogle(redirectTo)` and `exchangeCodeForSession(code)`
- [ ] T061 [US3] Implement `src/app/auth/callback/route.ts` — read `?code`, call `exchangeCodeForSession`, on success redirect to `/main`, on failure redirect to `/login?error=oauth_failed`
- [ ] T062 [P] [US3] Add "Google로 계속하기" button to `src/components/auth/SignInForm.tsx` (calls `signInWithGoogle('<origin>/auth/callback')`)
- [ ] T063 [P] [US3] Add "Google로 계속하기" button to `src/components/auth/SignUpForm.tsx`
- [ ] T064 [US3] Supabase Dashboard (manual): enable Google provider, paste OAuth client ID/secret; document in `specs/002-supabase-auth/quickstart.md` if URLs change
- [ ] T065 [US3] Run US3 tests — all pass

**Checkpoint**: All three User Stories functional. Feature complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 회귀 검증, 배포, 문서 정리.

- [ ] T066 [P] E2E regression suite: full existing-functionality walkthrough (CRUD, subtasks, view filters, calendar, stats, theme toggle) after auth is in place in `tests/e2e/regression-existing-features.spec.ts`
- [ ] T067 [P] Run `npm run typecheck` — fix any TS errors introduced
- [ ] T068 [P] Run full test suite (`npm test && npx playwright test`) — all green
- [ ] T069 Register Vercel environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel Dashboard for Production + Preview + Development
- [ ] T070 Register production callback URL in Supabase Dashboard → Authentication → URL Configuration (`https://<your-app>.vercel.app/auth/callback`)
- [ ] T071 Push branch and merge to `master` → Vercel auto-deploys production
- [ ] T072 Run the 5-step smoke test from `specs/002-supabase-auth/plan.md` § "배포 후 스모크 테스트" against the production URL
- [ ] T073 [P] Update `README.md` (if present) with a one-paragraph note pointing to `specs/002-supabase-auth/quickstart.md` for setup
- [ ] T074 [P] Delete obsolete localStorage-only seed code from old `TasksProvider` if any remains
- [ ] T075 Final acceptance: walk through `specs/002-supabase-auth/quickstart.md` end-to-end on a fresh clone; all 7 sections succeed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps — can start immediately
- **Foundational (Phase 2)**: depends on Setup
- **User Stories (Phase 3+)**: depend on Foundational complete
  - US1 (MVP) → independent
  - US2 → depends on Foundational; can run in parallel with US1 BUT integrates with US1's auth forms (so practically sequential or carefully coordinated)
  - US3 → depends on Foundational; can run in parallel with US1/US2
- **Polish (Phase 6)**: depends on the user stories selected for the release

### Within Each User Story

- All `[P]` tests in the "Tests" sub-phase can run in parallel (different files).
- Tests MUST be observed failing before implementation (Constitution I).
- Within implementation: data layer → UI components → integration.
- Each story finishes with its own test run before the next story begins.

### Critical Sequential Chains

- T010 (root middleware) depends on T009 (helper).
- T014 (apply 0002) depends on T013 (apply 0001) — subtasks references tasks.
- T020 (wire AuthProvider) depends on T019 (AuthProvider).
- T021 (route group layout) depends on T017 (auth.ts skeleton, used for `getServerUser`).
- T037 (auth impl) depends on T029 (auth tests).
- T039 (tasks impl) depends on T030 + T038 (tasks tests + mapping impl).
- T043 (TasksProvider refactor) depends on T039.
- T044 (main page hydration) depends on T043.
- T052 (LogoutButton) depends on T019 (`useAuth`).
- T060 (Google sign-in impl) depends on T037.
- T061 (callback route impl) depends on T058 (its test) and T060.

---

## Parallel Example: Phase 2 Foundational

```bash
# Round 1 — Supabase client modules (all touch different files):
T007 src/lib/supabase/client.ts
T008 src/lib/supabase/server.ts
T009 src/lib/supabase/middleware.ts

# Round 2 — DB migration files (different files, but T013/T014 apply order is enforced):
T011 supabase/migrations/0001_create_tasks_table.sql
T012 supabase/migrations/0002_create_subtasks_table.sql

# Round 3 — Skeletons in parallel:
T017 src/lib/data/auth.ts
T018 src/lib/data/tasks.ts
T019 src/context/AuthProvider.tsx
T016 src/lib/supabase/database.types.ts  # MCP-generated
```

## Parallel Example: Phase 3 US1 Tests

```bash
# All tests touch different files — full parallel:
T028 tests/unit/tasks-mapping.test.ts
T029 tests/unit/data-auth.test.ts
T030 tests/unit/data-tasks.test.ts
T031 tests/components/SignUpForm.test.tsx
T032 tests/components/SignInForm.test.tsx
T033 tests/integration/tasks-provider-crud.test.tsx
T034 tests/integration/existing-screens-regression.test.tsx
T035 tests/e2e/us1-signup-and-crud.spec.ts
T036 tests/e2e/us1-data-isolation.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) — T001–T006
2. Phase 2 (Foundational) — T007–T027
3. Phase 3 (US1) — T028–T046
4. **STOP & VALIDATE**: friends can sign up and manage their own tasks. Demo-ready.
5. Optional: deploy MVP to Vercel (subset of Phase 6: T069–T072) before adding US2/US3.

### Incremental Delivery

- US1 → Demo (MVP)
- + US2 → Demo (secure)
- + US3 → Demo (frictionless onboarding)
- + Polish → Production-ready

### Recommended Path for Demo Day

Single developer, time-boxed:

1. Setup + Foundational (Phases 1–2): half-day
2. US1 (Phase 3): full day
3. US2 (Phase 4): half-day
4. Deploy (Phase 6 T069–T072): 30 min
5. (Skip US3 if time is tight — email/password covers the friend-share goal.)

---

## Notes

- `[P]` = different files, no incomplete dependencies.
- `[Story]` label maps each task to a User Story for traceability.
- Each User Story is independently completable and demo-able.
- Tests fail before implementation (Constitution I — non-negotiable).
- Commit after each task or logical group; tests in the same commit as the code they cover (Constitution Workflow).
- Stop at any checkpoint to validate independently.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
