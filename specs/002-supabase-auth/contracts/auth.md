# Contract: Auth Data Layer

**File**: `src/lib/data/auth.ts`
**Consumed by**: `AuthProvider`, `login` page, OAuth callback route, `(protected)/layout.tsx`

이 모듈은 컴포넌트가 인증을 다루는 유일한 진입점이다. `supabase-js` / `@supabase/ssr` 의
인스턴스를 직접 사용하지 않는다.

---

## Types

```ts
export type SessionUser = {
  id: string;     // auth.users.id
  email: string | null;
};

export type AuthError = {
  /** UI에 그대로 보여줄 한국어 사용자 친화 메시지 */
  message: string;
  /** 원본 코드(분기/로깅용, UI 노출 X) */
  code?: string;
};

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };
```

---

## Functions (browser context)

```ts
/** 이메일/비밀번호 신규 가입. 성공 시 즉시 로그인 상태가 됨(이메일 확인 비활성). */
signUpWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthResult<SessionUser>>;

/** 이메일/비밀번호 로그인. */
signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthResult<SessionUser>>;

/** Google OAuth 시작. 브라우저를 Google 인증 페이지로 보냄(이 함수는 즉시 반환).
 *  반환값은 거의 사용되지 않음(리다이렉트가 일어나므로). 에러일 때만 ok=false 반환. */
signInWithGoogle(redirectTo: string): Promise<AuthResult<void>>;

/** 현재 세션 종료. 쿠키/저장소 정리 후 로그인 화면으로 라우팅하는 책임은 호출자에. */
signOut(): Promise<AuthResult<void>>;
```

---

## Functions (server context)

```ts
/** 서버 컴포넌트/Route Handler에서 현재 세션 사용자 조회. 없으면 null. */
getServerUser(): Promise<SessionUser | null>;

/** OAuth 콜백에서 ?code 를 세션으로 교환. 성공 시 세션 쿠키가 설정된다. */
exchangeCodeForSession(code: string): Promise<AuthResult<SessionUser>>;
```

---

## Error mapping

| Supabase 원본 에러               | `error.message` (한국어)                       |
|----------------------------------|----------------------------------------------|
| `Invalid login credentials`      | "이메일 또는 비밀번호가 올바르지 않습니다."          |
| `User already registered`        | "이미 가입된 이메일입니다. 로그인을 시도해 주세요."     |
| `Password should be at least 6...` | "비밀번호는 6자 이상이어야 합니다."                 |
| (network)                        | "네트워크 오류가 발생했습니다. 다시 시도해 주세요."     |
| (otherwise)                      | "잠시 후 다시 시도해 주세요."                      |

> 분기는 `code` 필드 또는 원본 메시지 패턴 매칭으로 수행하되, 정확한 매핑은 구현 시 확정.

---

## Test contract

각 함수는 다음 테스트로 잠금된다(헌법 I — Test-First):

- `signUpWithPassword` — 신규 이메일 → ok=true; 중복 이메일 → "이미 가입된 이메일입니다";
  6자 미만 비밀번호 → "6자 이상" 메시지.
- `signInWithPassword` — 올바른 자격 → ok=true; 잘못된 비밀번호 → "이메일 또는 비밀번호가
  올바르지 않습니다".
- `signInWithGoogle` — 모킹된 `supabase.auth.signInWithOAuth` 가 redirectTo 인자와 함께
  호출됨을 검증.
- `signOut` — 호출 후 `getServerUser()` 가 null 반환.
- `getServerUser` — 세션 있을 때 SessionUser 반환, 없을 때 null.
- `exchangeCodeForSession` — 유효한 code → ok=true + 세션 발급; 무효 code → ok=false.
