# Implementation Plan: 사용자 인증과 클라우드 동기화 (Supabase Auth)

**Branch**: `002-supabase-auth` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-supabase-auth/spec.md`

## Summary

기존 단일 사용자 로컬 Todo 앱(`localStorage` 기반, 단일 로그인 mock)을 Supabase 기반 다중
사용자 클라우드 앱으로 전환한다. 인증은 `@supabase/ssr` 의 쿠키 기반 SSR Auth를 사용하여
이메일/비밀번호 + Google OAuth를 지원하고, 데이터 접근은 `@supabase/supabase-js` 로
일원화한다. 사용자 간 데이터 격리는 **Supabase Postgres의 Row Level Security (RLS) 정책**으로
서버 측에서 강제하며, 모든 스키마/정책은 **Supabase MCP** 를 통해 마이그레이션 파일로 적용한다.
프론트엔드는 라우트 그룹(App Router)에 미들웨어 가드를 두어 비로그인 접근을 로그인 화면으로
리다이렉트한다.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)
**Primary Dependencies**:

- `next` 15.5 (App Router)
- `react` 18.3, `react-dom` 18.3
- `@supabase/ssr` ^0.5 — SSR-aware auth (쿠키 기반 세션)
- `@supabase/supabase-js` ^2.45 — DB 및 일반 클라이언트 작업
- (test) `vitest` 2.1, `@testing-library/react` 16, `jsdom`
- (test) `@playwright/test` ^1.49 — E2E browser tests (신규 도입)

**Storage**: Supabase Postgres. 마이그레이션은 `supabase/migrations/*.sql` 에 저장하며,
적용은 **Supabase MCP** (`apply_migration`, `execute_sql`) 로 자동화.
**Auth**: Supabase Auth — 이메일/비밀번호 + Google OAuth provider.
**Testing**:

- 단위/컴포넌트: Vitest + RTL (jsdom) — 기존 환경 그대로
- 데이터 레이어: mocked `supabase-js` 클라이언트로 단위 테스트
- 통합/회귀: RTL 기반 멀티 컴포넌트 흐름 테스트 (Supabase mock)
- E2E: Playwright — 실제 브라우저에서 회원가입 → 로그인 → CRUD → 로그아웃 흐름,
  접근 제어, 데이터 격리를 검증. 실 Supabase 테스트 프로젝트 또는 로컬 supabase-cli 사용.

**Target Platform**: 최신 데스크탑 웹 브라우저 (Chromium/Firefox/Safari 최근 버전).
**Hosting**: **Vercel** (Next.js 공식 호스팅). GitHub 레포(`InSung020707/todo-app-_test`)와
연결하여 `master` 푸시는 production, 그 외 브랜치/PR 은 preview 배포. Edge runtime 호환
미들웨어(`@supabase/ssr` 의 middleware helper)를 사용.
**Project Type**: Web application (Next.js single-project, App Router).
**Performance Goals**: 메인 화면 로드 후 할 일 목록 표시 5초 이내 (SC-004). 다른 페이지
전환은 정적 라우팅 수준.
**Constraints**:

- 서버 전용 시크릿(예: `SUPABASE_SERVICE_ROLE_KEY`)을 클라이언트 번들에 노출 금지.
  Vercel 대시보드의 환경 변수도 `NEXT_PUBLIC_*` 외에는 서버 전용으로만 등록.
- RLS는 user-facing 모든 테이블에서 활성화. 정책 없는 테이블 노출 금지.
- 기존 디자인 시스템(`colors_and_type.css`, 토큰 레이어)과 4개 화면 픽셀 동등성 유지.
- 미들웨어는 **Edge runtime 호환**이어야 한다(Vercel Edge에서 실행). Node 전용 API 사용 금지.

**Scale/Scope**: 수업 데모 + 친구 공유 시나리오. 동시 사용자 수십 명 수준. 사용자당 할 일
수백 건 이내. Supabase Free tier로 충분.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v2.0.0 의 각 원칙에 대한 평가:

| Gate | Status | Notes |
|------|--------|-------|
| **I. Test-First (NON-NEGOTIABLE)** | ✅ PASS | 모든 신규 모듈(데이터 레이어, 라우트 가드, Auth UI)은 Red→Green→Refactor. E2E 시나리오도 테스트 우선으로 작성. |
| **II. Design Fidelity** | ✅ PASS | 기존 4개 화면 디자인 100% 유지. 로그인 화면은 기존 디자인을 그대로 사용하되 mock 클릭 핸들러를 실제 인증 호출로 교체. 회원가입 폼은 기존 로그인 컴포넌트 스타일을 답습. |
| **III. Simplicity & YAGNI** | ⚠ NOTED | 새 의존성 3개 추가(@supabase/ssr, @supabase/supabase-js, @playwright/test). 각각 명세에서 직접 요구되거나(인증/저장), 명세의 E2E 요구사항을 충족하기 위해 필요. Complexity Tracking 참조. |
| **IV. Component Modularity** | ✅ PASS | 데이터 레이어는 단일 모듈(`src/lib/data/*`)로 분리. 컴포넌트는 `supabase-js` 를 직접 호출하지 않고 데이터 레이어만 사용. |
| **V. Accessibility** | ✅ PASS | 회원가입/로그인 폼은 시맨틱 HTML(`<form>`/`<label>`/`<input>`)과 `aria-live` 오류 영역 사용. 기존 화면 접근성은 보존. |

**Verdict**: PASS with documented complexity (Playwright + 2 Supabase libs). 진행 가능.

## Project Structure

### Documentation (this feature)

```text
specs/002-supabase-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth.md          # Auth API contract (signIn/signUp/signOut/getUser)
│   └── tasks.md         # Tasks data API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                          # 루트 레이아웃 (ThemeProvider 등)
│   ├── page.tsx                            # "/" — 세션 있으면 /main, 없으면 /login
│   ├── login/
│   │   └── page.tsx                        # 로그인/회원가입 화면
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                    # OAuth 콜백 핸들러
│   └── (protected)/                        # 인증 필요 라우트 그룹
│       ├── layout.tsx                      # 가드: 세션 없으면 /login 리다이렉트
│       ├── main/
│       │   └── page.tsx                    # 기존 메인 (TasksProvider 소비)
│       ├── calendar/
│       │   └── page.tsx
│       └── stats/
│           └── page.tsx
├── components/
│   ├── auth/                               # 신규: SignInForm, SignUpForm, LogoutButton
│   ├── login/                              # 기존 로그인 컴포넌트(폼 컨테이너로 재구성)
│   ├── main/, calendar/, stats/, shared/   # 기존 컴포넌트(소비처 시그니처만 미세 조정)
├── context/
│   ├── ThemeProvider.tsx                   # 기존
│   ├── TasksProvider.tsx                   # 리팩터: localStorage → Supabase 데이터 레이어
│   └── AuthProvider.tsx                    # 신규: 세션 구독 + signOut 노출
├── lib/
│   ├── supabase/                           # 신규
│   │   ├── client.ts                       # browser client (@supabase/ssr)
│   │   ├── server.ts                       # server client (@supabase/ssr)
│   │   └── middleware.ts                   # 세션 갱신 helper
│   ├── data/                               # 신규: 컴포넌트가 호출하는 유일한 데이터 API
│   │   ├── auth.ts                         # signIn/signUp/signInWithGoogle/signOut/getUser
│   │   └── tasks.ts                        # getTasks/createTask/updateTask/deleteTask, subtasks
│   ├── store/                              # 기존: filterTasks 등 순수 selector (변경 최소)
│   └── types.ts                            # Task/Subtask 타입 (서버 row 매핑 추가)
├── middleware.ts                           # 신규: Next.js 미들웨어 (세션 토큰 새로고침)
└── styles/                                 # 기존 (디자인 토큰)

supabase/
└── migrations/
    ├── 0001_create_tasks_table.sql         # 신규: tasks 테이블 + RLS
    └── 0002_create_subtasks_table.sql      # 신규: subtasks 테이블 + RLS

tests/
├── unit/                                   # 기존 유지 (selectors, helpers)
├── components/                             # 기존 + Auth 컴포넌트 추가
├── integration/                            # 신규: 데이터 레이어 mock으로 흐름 검증
│   ├── auth-flow.test.tsx
│   ├── tasks-crud-after-auth.test.tsx      # 기존 기능 회귀 (FR-012)
│   └── data-isolation.test.tsx             # 두 사용자 mock으로 격리 확인
└── e2e/                                    # 신규: Playwright
    ├── playwright.config.ts
    ├── auth.spec.ts                        # US1 회원가입~로그인~CRUD~로그아웃
    ├── access-guard.spec.ts                # US2 비로그인 차단/리다이렉트
    ├── google-oauth.spec.ts                # US3 (모킹 가능 시)
    └── regression.spec.ts                  # FR-012 기존 기능 회귀
```

**Structure Decision**: Next.js single-project (App Router). 라우트 그룹 `(protected)` 으로
인증이 필요한 화면을 묶고 그룹 레이아웃에서 서버 사이드 가드를 수행한다. 데이터 접근은
`src/lib/data/*` 단일 진입점에 집중하여 RLS와 함께 이중 안전망을 형성한다.

## Deployment (Vercel)

### 환경 변수 (Vercel Dashboard → Project Settings → Environment Variables)

| Name                            | Value                              | Environments              | Type        |
|---------------------------------|------------------------------------|---------------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://<proj>.supabase.co`       | Production, Preview, Dev  | Plaintext   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...`               | Production, Preview, Dev  | Plaintext   |

- `.env.local` 은 절대 커밋하지 않으며, 동일 값을 Vercel 대시보드에서 따로 등록한다.
- `SUPABASE_SERVICE_ROLE_KEY` 같은 비공개 키는 **이 기능에서 사용하지 않는다**(헌법 v2).
  필요해지면 Vercel 환경 변수 + 서버 컴포넌트/Route Handler 내부에서만 참조한다.

### OAuth Redirect URLs (Supabase Dashboard → Authentication → URL Configuration)

| 환경         | Site URL                                  | Additional Redirect URL                          |
|--------------|-------------------------------------------|--------------------------------------------------|
| Production   | `https://<your-app>.vercel.app`           | `https://<your-app>.vercel.app/auth/callback`    |
| Preview      | (Site URL 무시, wildcard 사용)             | `https://*-<vercel-team>.vercel.app/auth/callback` |
| Local dev    | `http://localhost:3000`                   | `http://localhost:3000/auth/callback`            |

- Vercel preview URL은 PR마다 달라지므로 **wildcard 형태로 등록**한다. (Supabase가 wildcard 미지원이면
  수업 데모용으로는 PR 생성 시 일회성으로 추가하거나, preview 환경의 OAuth는 비활성화하고
  이메일/비밀번호만 사용한다.)
- 커스텀 도메인이 추가되면 그 도메인의 callback URL도 등록한다.

### 빌드/배포

- **빌드 명령**: `npm run build` (Vercel 자동 감지)
- **출력**: `.next/` (Vercel 자동 감지)
- **Node 버전**: package.json `engines` 또는 Vercel 프로젝트 설정에서 `Node 20.x` 고정 권장.
- **Edge runtime**: `src/middleware.ts` 는 기본적으로 Edge 에서 실행. `@supabase/ssr` 의
  `createMiddlewareClient`(또는 동등) 헬퍼만 사용하며, Node 전용 모듈 import 금지.
- **GitHub 연동**: `master` 푸시 → Production 배포. PR 생성 → Preview 배포(URL 자동 코멘트).

### 배포 후 스모크 테스트 (수동)

1. Production URL 접속 → 로그인 화면으로 리다이렉트되는지(SC-003) 확인.
2. 새 이메일로 가입 → 즉시 메인 진입(SC-001).
3. 할 일 추가/완료 → 새로고침 → 데이터 유지(FR-009 클라우드 동기화).
4. 시크릿 창에서 동일 계정으로 로그인 → 같은 할 일이 보이는지(SC-004).
5. 로그아웃 → 메인 URL 직접 접근 → 로그인 화면으로 이동(SC-005).

자동화된 검증은 Playwright E2E suite 가 Production URL을 대상으로 실행될 수도 있으나,
v1 한정 수동 스모크로 충분.

## Complexity Tracking

> Constitution v2.0.0 의 III(Simplicity & YAGNI) 가 추가 의존성을 도입할 때마다 정당화를 요구하므로,
> 이번 도입을 기록한다.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `@supabase/ssr` 추가 | Next.js App Router 의 Server Components/Route Handlers/Middleware 에서 쿠키 기반 세션을 안전하게 다루려면 `supabase-js` 만으로는 부족(브라우저 전용). 명세 FR-004(세션 지속), FR-006(서버 가드) 충족에 필수. | `supabase-js` 단독 + 직접 쿠키 처리: 보안 위험(쿠키 옵션 누락, CSRF) 및 토큰 갱신 직접 구현 부담. |
| `@supabase/supabase-js` 추가 | 명세 FR-001~009 의 모든 인증/데이터 접근. 헌법 v2 가 명시한 유일한 데이터 액세스 클라이언트. | REST 직접 호출: 인증 헤더/토큰 갱신/타입 안전성 모두 수동 구현 → YAGNI 위반 비용이 더 큼. |
| `@playwright/test` 추가 | 명세의 "각 User Story별 E2E 테스트 시나리오"와 "접근 제어 E2E 테스트" 충족. 인증 콜백(브라우저 리다이렉트), 쿠키 기반 세션, 다중 사용자 데이터 격리는 jsdom에서 충분히 검증되지 않음. | jsdom 통합 테스트로 모두 커버: 가능은 하나, OAuth 콜백/쿠키 라우팅 등 실제 브라우저 거동을 mock으로 충실히 재현하면 mock 코드가 실코드보다 커짐 → 헌법 I(Test-First)이 요구하는 "신뢰할 수 있는 실패"를 보장하지 못함. |

위 세 항목은 헌법 III(YAGNI)에서 "spec에서 직접 요구"하는 경우 허용되는 범위이므로
**위반이 아니라 명시적 도입**으로 기록한다. Constitution Check 는 PASS.
