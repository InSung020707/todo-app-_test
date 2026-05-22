# Quickstart: 002-supabase-auth

**Date**: 2026-05-22

새 개발자가 이 기능을 로컬에서 돌리고 테스트하기까지의 최소 절차.

---

## 1. 환경 변수

`.env.local` 에 다음 두 줄이 있어야 한다(이미 설정 완료).

```text
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
```

**중요**: `SUPABASE_SERVICE_ROLE_KEY` 같은 server-only 시크릿은 클라이언트 번들에 들어가면
안 된다(헌법 v2 — Technology Constraints). 본 기능에서는 anon key 만 사용한다.

---

## 2. 의존성 설치

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D @playwright/test
npx playwright install --with-deps
```

---

## 3. Supabase 스키마 적용 (Supabase MCP)

마이그레이션 파일이 `supabase/migrations/0001_*.sql`, `0002_*.sql` 로 준비되면, MCP `apply_migration`
도구로 원격 Supabase 프로젝트에 적용한다.

확인:

```sql
-- Supabase Studio → SQL Editor 또는 MCP `execute_sql`
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('tasks','subtasks');
-- → 두 개 모두 반환되어야 함

select tablename, policyname from pg_policies
where schemaname = 'public' order by tablename, policyname;
-- → tasks/subtasks 각각 4개씩(select/insert/update/delete) 정책 존재
```

---

## 4. Supabase Auth 설정 (대시보드)

- **Email auth**: 활성. **Confirm email**: OFF(데모 시나리오, R7 참조).
- **Password policy**: 최소 6자(기본값).
- **Google provider**: 활성. Client ID/Secret 입력. Redirect URL:
  `https://<your-project>.supabase.co/auth/v1/callback` (Supabase가 기본 제공).
- 앱 측 콜백 URL: `http://localhost:3000/auth/callback` (dev), 배포 시 해당 도메인.

---

## 5. 로컬 dev 실행

```bash
npm run dev
# http://localhost:3000 접속 → 로그인 화면으로 자동 리다이렉트(비로그인)
```

흐름 확인:

1. 새 이메일(예: `dev+1@example.com`) + 비밀번호로 가입 → 메인 자동 진입.
2. 할 일 몇 개 추가/완료/별표/삭제 → 새로고침 → 모두 유지.
3. 로그아웃 → 로그인 화면.
4. 다른 이메일(`dev+2@example.com`)로 가입 → 빈 목록 → 격리 확인.

---

## 6. 테스트 실행

```bash
# 단위 + 컴포넌트 + 통합
npm run test          # vitest run

# E2E
npx playwright test
```

E2E 는 별도 Supabase 테스트 프로젝트(또는 브랜치) 의 URL/키를 `.env.test.local` 에 두고
실행한다(R9 참조). 테스트 사용자는 각 테스트에서 `crypto.randomUUID()` 로 만든 이메일을 사용.

---

## 7. 흔한 함정

- **dev 서버에서 .env.local 인식 안 됨** → 서버 재시작.
- **세션이 새로고침 후 풀림** → `middleware.ts` 의 세션 갱신이 동작하는지 확인.
- **로그아웃 후 뒤로가기로 메인이 잠깐 보임** → 보호 라우트 그룹의 layout 이 서버 사이드
  `redirect()` 를 즉시 수행하는지 확인(클라이언트 useEffect 가드 X).
- **다른 사용자의 데이터가 보임** → 즉시 멈출 것. RLS 비활성 또는 잘못된 정책. 정책 SQL을
  다시 적용하기 전까지 절대 배포 금지(SC-002 100% 격리는 비협상).

---

## 8. Vercel 배포

### 첫 배포 (수동, 1회만)

1. https://vercel.com 접속 → GitHub 로 로그인.
2. **Add New → Project** → `InSung020707/todo-app-_test` 선택 → **Import**.
3. Framework Preset: **Next.js** (자동 감지). Root Directory: `./` 그대로.
4. **Environment Variables** 섹션에서 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<proj>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_...`
   - 두 변수 모두 Production / Preview / Development 환경 모두 체크.
5. **Deploy** 클릭. 1-2분 후 `https://<your-app>.vercel.app` URL 발급.

### Supabase 측 OAuth/사이트 URL 등록

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs** (각 줄에 하나씩 추가):
  ```text
  http://localhost:3000/auth/callback
  https://<your-app>.vercel.app/auth/callback
  ```
- Preview 도메인까지 지원하려면 Preview용 redirect URL을 한 줄 더 추가하거나
  Preview에서는 OAuth 비활성화하고 이메일/비밀번호만 사용.

### 이후 배포 (자동)

- `git push origin master` → Vercel이 Production 빌드 자동 트리거.
- PR 생성 → Preview URL 자동 생성, PR 댓글로 URL 자동 코멘트.
- Vercel Dashboard → Deployments 에서 빌드 로그/롤백 가능.

### 배포 후 스모크 테스트

위 plan.md 의 "배포 후 스모크 테스트" 5단계를 production URL에서 그대로 수행.

### 흔한 함정 (Vercel)

- **빌드 실패: `NEXT_PUBLIC_SUPABASE_URL is not defined`** → Vercel 환경 변수에 누락.
  대시보드에서 추가 후 **Redeploy** (push 없이 가능).
- **로그인 후 콜백에서 "redirect_uri_mismatch"** → Supabase URL Configuration에 Vercel
  도메인의 `/auth/callback` 이 등록되지 않음.
- **Preview 배포에서만 로그인 실패** → Preview URL은 매번 바뀌므로 Supabase에 wildcard
  redirect URL이 없으면 실패. 대안: Preview에서 OAuth만 비활성화.
- **Edge runtime 빌드 에러** → middleware.ts 에서 Node 전용 모듈 import. `@supabase/ssr` 의
  middleware helper 만 사용했는지 확인.

---

## 9. 산출물 매핑 (이 문서 ↔ 코드)

| 산출물(이 spec)              | 코드 위치                                  |
|------------------------------|--------------------------------------------|
| `contracts/auth.md`         | `src/lib/data/auth.ts`                     |
| `contracts/tasks.md`        | `src/lib/data/tasks.ts`                    |
| `data-model.md`             | `supabase/migrations/0001_*.sql`, `0002_*.sql` |
| Auth UI                     | `src/components/auth/*`, `src/app/login/page.tsx` |
| Route guard                 | `src/app/(protected)/layout.tsx`           |
| Session refresh middleware  | `src/middleware.ts`                        |
| OAuth callback              | `src/app/auth/callback/route.ts`           |

본 문서는 새 개발자/리뷰어가 5분 안에 빌드/테스트할 수 있도록 한다.
