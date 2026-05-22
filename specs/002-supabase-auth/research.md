# Phase 0 Research: Supabase Auth & Cloud Sync

**Date**: 2026-05-22 | **Feature**: 002-supabase-auth

이 문서는 plan.md Technical Context 의 각 기술 선택에 대한 결정(Decision), 근거(Rationale),
그리고 거부된 대안(Alternatives considered)을 기록한다. 모든 `NEEDS CLARIFICATION` 은 해결되었다.

---

## R1. Auth 라이브러리 선택

**Decision**: `@supabase/ssr` (^0.5) 를 인증/세션 처리에 사용. `@supabase/supabase-js` 는 데이터
접근 클라이언트로만 사용.

**Rationale**:

- Next.js App Router는 Server Components, Route Handlers, Middleware 등 서버 컨텍스트와
  브라우저 컨텍스트를 모두 다룬다. `@supabase/ssr` 은 각 컨텍스트에 맞는 헬퍼
  (`createBrowserClient`, `createServerClient`, `createMiddlewareClient`) 를 제공하고,
  쿠키 기반 세션 저장/갱신을 안전하게 위임한다.
- 명세 FR-004(새로고침/브라우저 재시작 후 로그인 유지)는 쿠키 기반 세션이 표준이며,
  `@supabase/ssr` 이 권장 경로다.
- 명세 FR-006(서버 가드 — 비로그인 차단)을 서버 컴포넌트에서 즉시 평가해 리다이렉트하려면
  서버 사이드 세션 조회가 필요하고, `@supabase/ssr` 의 `createServerClient` 가 이를 제공한다.

**Alternatives considered**:

- `@supabase/auth-helpers-nextjs`: 이전 버전. 공식 deprecate 권고. 채택 ❌.
- `@supabase/supabase-js` 단독 + 자체 쿠키 처리: 가능하나 보안 위험과 토큰 갱신 직접 구현
  부담이 크다. YAGNI 비용이 라이브러리 도입을 정당화한다. 채택 ❌.

---

## R2. 데이터 액세스 라이브러리

**Decision**: `@supabase/supabase-js` (^2.45) 를 데이터 작업(SELECT/INSERT/UPDATE/DELETE)에
사용. 모든 호출은 `src/lib/data/*` 모듈에서만 발생.

**Rationale**:

- 헌법 v2 가 "Supabase 접근은 `@supabase/supabase-js` 로만" 을 명시.
- 타입 안전한 쿼리 빌더, 자동 인증 헤더, 실시간 구독(차후 확장 여지) 등을 제공.
- 컴포넌트는 `lib/data` 의 함수만 호출하여 헌법 IV(Component Modularity) 충족.

**Alternatives considered**:

- 직접 REST 호출: 토큰/타입 모두 수동. 채택 ❌.
- ORM(Drizzle/Prisma): Supabase 의 RLS와 결합도가 낮고, 작은 스코프에서 과한 추상화. 채택 ❌.

---

## R3. 라우트 보호 패턴

**Decision**: App Router의 **라우트 그룹** `app/(protected)/` 을 만들고, 그룹의
`layout.tsx` 에서 서버 사이드로 세션을 조회하여 세션이 없으면 `/login` 으로
`redirect()` 한다. 추가로 Next.js 루트 `middleware.ts` 에서 `@supabase/ssr` 의
세션 갱신 미들웨어를 실행하여 토큰을 최신 상태로 유지한다.

**Rationale**:

- 그룹 레이아웃 가드는 코드 한 곳(그룹 layout)으로 모든 보호 경로를 커버 → DRY.
- 미들웨어에서 세션 토큰을 매 요청마다 갱신하면 만료된 쿠키로 인한 미세 버그를 방지.
- 클라이언트 측 가드보다 서버 측 가드가 보안적으로 우수(FR-008 데이터 격리와 일치).

**Alternatives considered**:

- 매 페이지마다 `redirect()` 호출: 중복. 채택 ❌.
- 클라이언트 사이드 `useEffect` 가드: 깜빡임(보호 화면이 잠시 노출). 채택 ❌.

---

## R4. 데이터 격리 — RLS 정책 모델

**Decision**: `tasks`, `subtasks` 양 테이블에 RLS 활성화. 각 테이블의 모든 작업
(SELECT/INSERT/UPDATE/DELETE)에 대해 **`auth.uid() = user_id`** 정책을 적용. `subtasks`는
부모 `tasks.user_id` 와 일치하는 `user_id` 컬럼을 비정규화 보관하여 정책이 단순/일관되게 적용.

**Rationale**:

- RLS 는 서버 사이드에서 강제되는 진정한 격리. 클라이언트 코드를 우회해도 보호된다(FR-008,
  SC-002 100% 격리).
- `subtasks.user_id` 비정규화는 조인 없이 정책을 평가할 수 있게 하여 성능과 가독성 향상.
- INSERT 시에도 정책이 적용되므로 사용자가 다른 사용자의 `user_id` 로 임의 삽입 불가.

**Alternatives considered**:

- 애플리케이션 레이어에서 `user_id` 필터만 추가: 클라이언트 우회 가능. 채택 ❌.
- `subtasks` 격리를 부모 join 으로 평가: 매 정책 평가 시 join 비용. 채택 ❌.

---

## R5. 마이그레이션 적용 방식

**Decision**: 스키마/RLS는 `supabase/migrations/*.sql` 에 SQL 파일로 작성하고, **Supabase MCP**
의 `apply_migration` 도구로 원격 프로젝트에 적용. 변경 사항은 항상 마이그레이션 파일을
커밋과 동반.

**Rationale**:

- 헌법 v2 의 "스키마 변경은 마이그레이션 파일로" 규칙 준수.
- MCP 가 PR/대화 안에서 직접 적용 가능 → 자동화 가능 + 사람의 검토 동시.
- 파일 자체가 진실의 원천이므로 다른 환경(로컬 supabase-cli, CI)에서도 재현 가능.

**Alternatives considered**:

- Supabase Studio UI 에서 직접 변경: 버전관리 불가. 채택 ❌.
- Drizzle 같은 ORM 마이그레이션: 과한 추상화, RLS DSL 미지원. 채택 ❌.

---

## R6. Google OAuth 구현

**Decision**: Supabase Auth 의 OAuth 공급자 기능을 사용. 클라이언트에서
`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <callback url> } })`
호출 → Supabase 가 Google 콘센트 페이지로 리다이렉트 → 콜백을 `app/auth/callback/route.ts` 가
받아 `exchangeCodeForSession` 으로 세션 발급 → `/main` 으로 리다이렉트.

**Rationale**:

- Google OAuth 클라이언트 자격은 Supabase 대시보드에서 1회 등록하면 끝, 코드 측은
  공급자 식별자만 지정.
- 콜백 처리는 표준 패턴이며 `@supabase/ssr` 가이드를 따른다.

**Alternatives considered**:

- 직접 OAuth 2.0 PKCE 구현: 과한 작업. 채택 ❌.
- `next-auth`(Auth.js): 추가 의존성, Supabase RLS와의 통합 복잡. 채택 ❌.

---

## R7. 비밀번호 정책 및 이메일 확인

**Decision**: Supabase Auth 기본값을 사용. 비밀번호 최소 6자, **이메일 확인 비활성화**
(수업 데모 시나리오에 따라 회원가입 즉시 로그인).

**Rationale**:

- 명세 Assumptions 에 명시. 데모 흐름을 단순화하고 수업 시연을 빠르게 한다.
- 향후 프로덕션 전환 시 Supabase 대시보드에서 한 토글로 활성화 가능.

**Alternatives considered**:

- 이메일 확인 강제: 데모 흐름 길어짐, 메일 도착 대기. 채택 ❌(v1 한정).

---

## R8. E2E 테스트 프레임워크

**Decision**: `@playwright/test` (^1.49) 를 신규 도입. 실제 브라우저에서 회원가입 →
로그인 → CRUD → 로그아웃 흐름, 라우트 가드, 데이터 격리, 기존 기능 회귀를 검증.

**Rationale**:

- 명세가 명시한 "E2E 테스트 시나리오" 와 "접근 제어 E2E 테스트" 를 충실히 검증하려면
  실제 쿠키/리다이렉트/네비게이션 동작이 필요.
- Playwright 는 Next.js 와 Supabase 양쪽에서 표준 권장.
- 다른 사용자 격리를 검증할 때 storageState 를 분리해 두 컨텍스트를 쉽게 다룰 수 있다.

**Alternatives considered**:

- Cypress: 가능하나 멀티 도메인(OAuth 콜백) 다루기 까다롭다. 채택 ❌.
- jsdom + RTL + msw 로만 커버: 쿠키/리다이렉트/세션 지속을 mocking 하다 보면 mock 코드가
  실코드보다 비대해진다. 채택 ❌.

---

## R9. E2E 환경에서 Supabase 사용 방식

**Decision**: E2E 실행 시 별도의 **Supabase 테스트 브랜치/프로젝트** 를 사용. CI 와 로컬
모두에서 같은 마이그레이션이 적용된 인스턴스를 사용. 각 테스트는 시작 전에 자신만의
랜덤 이메일로 가입하여 격리되며, 종료 시 정리(테스트 사용자 삭제)는 후속 cleanup 스크립트가
처리(스코프 외, v1 한정).

**Rationale**:

- 프로덕션과 동일한 RLS/스키마에서 검증해야 데이터 격리(SC-002)를 실증 가능.
- 헌법 v2 의 "테스트는 mocked 또는 local/branch Supabase — never production" 충족.

**Alternatives considered**:

- Supabase 로컬(supabase-cli + Docker): 가장 깔끔하나 학습/CI 셋업 부담. 채택 가능하지만
  v1 한정으로 브랜치 사용 → docker 마이그레이션은 후속 작업.

---

## R10. 기존 코드 영향 (회귀 방지)

**Decision**: `TasksProvider` 를 리팩터링하여 내부 저장만 localStorage → Supabase 데이터
레이어로 교체. 컴포넌트가 보는 **공개 시그니처(메서드 이름, 인자, 반환 모양)는 변경하지
않는다**. 순수 selector(`filterTasks`, `groupTasks` 등)는 변경 0.

**Rationale**:

- 명세 FR-012(기존 기능 회귀 0), 헌법 II(Design Fidelity), IV(Modularity) 모두 충족.
- 컴포넌트 테스트의 90% 이상이 변경 없이 그대로 통과해야 회귀가 0임을 빠르게 검증 가능.

**Alternatives considered**:

- 전면 재설계(상태 관리 라이브러리 도입 등): YAGNI 위반. 채택 ❌.

---

## R11. 호스팅 — Vercel

**Decision**: Vercel (Next.js 공식 호스팅)을 사용. GitHub 레포(`InSung020707/todo-app-_test`)와
연결하여 `master` 푸시는 Production, 그 외는 Preview 자동 배포. 환경 변수는 Vercel 대시보드에서
관리. Supabase OAuth Redirect URL 에 Production/Preview/Local 세 환경을 등록.

**Rationale**:

- Next.js App Router/Edge Middleware/Image 최적화/Server Components 모두 Vercel 에서 무설정
  최적화. Supabase 와의 결합도 가장 표준적.
- GitHub 통합으로 PR 단위 미리보기가 자동 생성 → 친구 공유 시나리오에 적합.
- 무료 플랜으로 수업 데모/친구 공유 트래픽 충분.
- `.env.local` 을 커밋하지 않고 동일 값을 Vercel 대시보드에서 별도 등록하면 시크릿 누출
  위험 0.

**Alternatives considered**:

- Netlify: 가능하나 Next.js 의 일부 SSR/Edge 기능에서 추가 어댑터가 필요. 채택 ❌.
- Cloudflare Pages/Workers: 빠르지만 Next.js App Router의 일부 신기능 호환성이 뒤따라옴.
  채택 ❌(v1 한정).
- 자가 호스팅(Docker/EC2): 운영 부담. 데모 목표에 과함. 채택 ❌.

**Constraints introduced**:

- `src/middleware.ts` 는 **Edge runtime** 에서 실행되므로 Node 전용 모듈 import 금지.
  `@supabase/ssr` 의 미들웨어 헬퍼는 Edge 호환이라 OK.
- Preview URL은 PR마다 달라지므로 Supabase OAuth Redirect URL을 wildcard로 등록하거나,
  Preview에서는 OAuth를 비활성화하고 이메일/비밀번호만 사용한다.

---

## Summary

| ID | Topic | Decision (one line) |
|----|-------|---------------------|
| R1 | Auth lib | `@supabase/ssr` |
| R2 | Data lib | `@supabase/supabase-js` (only via `src/lib/data/*`) |
| R3 | Route guard | Route group `(protected)` + root middleware |
| R4 | Isolation | RLS `auth.uid() = user_id` on tasks/subtasks |
| R5 | Migrations | SQL files + Supabase MCP `apply_migration` |
| R6 | Google OAuth | `signInWithOAuth` + `/auth/callback` route handler |
| R7 | Auth policy | 6+ chars, no email verification (demo) |
| R8 | E2E | `@playwright/test` |
| R9 | E2E env | Separate Supabase branch/project, random emails per test |
| R10 | Existing code | TasksProvider 내부만 교체, public API 불변 |
| R11 | Hosting | Vercel — GitHub 자동 배포(Prod/Preview), Edge middleware 호환, env는 대시보드 |

모든 NEEDS CLARIFICATION 해결됨. Phase 1 진행 가능.
