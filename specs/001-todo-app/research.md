# Phase 0 Research: demodev Tasks — 한국어 Todo 웹앱

**Date**: 2026-05-15 | **Plan**: [plan.md](./plan.md)

Technical Context에 `NEEDS CLARIFICATION` 마커는 없다 — 기술 스택·범위·영속화·SideNav·
통계 데이터·테마 토글 위치는 사전 질문과 `/speckit-clarify`에서 모두 확정됐다. 이
문서는 각 결정의 근거와 채택한 베스트 프랙티스를 기록한다.

---

## R1. 상태 관리 — Context + useReducer (추가 라이브러리 없음)

- **Decision**: 할 일 상태는 순수 `reducer` + React `useReducer`를 감싼 `TasksProvider`
  Context로 공유한다. Zustand·Redux 등 외부 상태 라이브러리는 쓰지 않는다.
- **Rationale**: 화면 3개(/main, /calendar, /stats)가 같은 할 일 목록을 읽고 메인만
  변경한다 — 공유는 필요하지만 규모가 작다. 순수 리듀서로 분리하면 Constitution 원칙
  I(Test-First)·IV(Modularity)를 구조적으로 만족한다(리듀서를 React 없이 단위 테스트).
  원칙 III(YAGNI)상 외부 의존성 추가 불가.
- **Alternatives considered**:
  - Zustand — 간결하지만 불필요한 의존성, 순수 리듀서만큼 테스트 격리가 깔끔하지 않음.
  - 화면별 로컬 `useState`(프로토타입 방식) — 라우팅 시 화면 간 상태가 공유되지 않아 탈락.
  - URL/서버 상태 — 백엔드 없음, localStorage가 단일 진실원.

## R2. 영속화 — localStorage, 명시적 load/save, 손상 복구

- **Decision**: `persistence.ts`가 `loadTasks()`/`saveTasks()`/`loadTheme()`/`saveTheme()`를
  제공한다. `loadTasks()`는 (a) 저장 키 없음 → `SAMPLE_TASKS` 시드, (b) `JSON.parse`
  실패 또는 스키마 불일치 → `SAMPLE_TASKS`로 안전 복구, (c) 정상 → 저장값 반환.
  `TasksProvider`는 `useReducer`의 lazy initializer로 `loadTasks()`를 호출하고, 상태
  변경 시 `useEffect`로 `saveTasks()`한다.
- **Rationale**: spec FR-006~FR-008, TR-003. load/save를 순수 함수로 두면 localStorage를
  목으로 바꿔 시드·정상·손상 3경로를 단위 테스트할 수 있다.
- **Alternatives considered**:
  - IndexedDB — 단일 사용자 소규모 데이터에 과함.
  - 영속화를 Provider 안에 인라인 — 테스트 격리가 어려워 탈락.
- **베스트 프랙티스**: SSR 안전성을 위해 `typeof window === 'undefined'` 가드. 첫
  클라이언트 마운트 전에는 쓰기 effect가 시드값을 즉시 되쓰지 않도록 마운트 플래그 사용.

## R3. "오늘" 고정 — 2026-05-15 상수

- **Decision**: `dates.ts`가 `TODAY = new Date(2026, 4, 15)`, `TODAY_KEY = '2026-05-15'`를
  export하고, 모든 상대 날짜 로직(`relDay`, `isOverdue`, `isToday`, `isUpcoming`)과
  캘린더 기준월·통계 주간이 이 상수만 참조한다. `Date.now()`/`new Date()`(현재시각)는
  도메인 로직에서 쓰지 않는다.
- **Rationale**: spec FR-004. 프로토타입과 동일한 결정론적 데모. 테스트가 시스템
  시계에 의존하지 않아 안정적.
- **Alternatives considered**: 실제 현재 시각 — 샘플 데이터의 "오늘/지연/예정" 분류가
  실행일마다 달라져 디자인·테스트와 어긋남. 탈락.

## R4. 디자인 토큰·스타일 — 번들 CSS verbatim 이식

- **Decision**: `colors_and_type.css`는 핸드오프 번들에서 글자 그대로 복사한다(폰트
  `@import`, OKLCH 그레이스케일, accent, semantic, radius/spacing/shadow 토큰, 다크
  미러). `todo.css`의 컴포넌트 규칙(`.btn`, `.chip`, `.field`, `.check`, `.login*`,
  `.main`/`.nav`/`.list`/`.row`/`.detail`, `.cal*`, `.stats*` 등)도 verbatim 이식하되,
  프로토타입 전용 셀렉터(`.app`, `.design-canvas`, `.twk-*`, `.dc-*`)와 캔버스 오버라이드는
  제외한다. 두 파일을 `src/styles/`에 두고 `app/layout.tsx`에서 import.
- **Rationale**: Constitution 원칙 II. 토큰·스타일을 재유도하지 않는다 = 픽셀 충실도를
  공짜로 얻는 가장 안전한 방법.
- **Alternatives considered**:
  - Tailwind/CSS-in-JS로 재작성 — 토큰 스케일 재유도 위험, 원칙 II 위반. 탈락.
  - CSS Modules로 스코핑 — 클래스명이 바뀌면 verbatim 이식이 깨짐. 전역 CSS 유지가 더 충실.
- **주의**: 프로토타입은 `.app`이 `display:flex; overflow:hidden`으로 아트보드를 채웠다.
  프로덕션에선 각 라우트 페이지가 `100vh` 컨테이너를 제공하고 화면 루트(`.login`/`.main`/
  `.cal`/`.stats`)가 그 안을 채운다.

## R5. 라우팅 & 통합 SideNav

- **Decision**: App Router 4개 경로 — `/`(로그인), `/main`, `/calendar`, `/stats`.
  `/main`은 현재 뷰/카테고리를 URL 쿼리(`?view=today` / `?cat=design`)로 받아 SideNav가
  `next/link` 또는 `useRouter`로 이동시킨다. SideNav는 단일 컴포넌트로 세 화면이 공유하며
  현재 경로·쿼리에 따라 활성 항목을 표시하고, footer에 테마 토글을 둔다.
- **Rationale**: `/speckit-clarify` Q1(통합 단일 SideNav), Q3(테마 토글 footer). 뷰
  전환을 URL에 두면 새로고침·딥링크가 자연스럽고, SideNav가 경로만 보고 활성 상태를
  계산할 수 있어 상태 결합이 줄어든다.
- **Alternatives considered**:
  - 뷰를 메인 컴포넌트 로컬 상태로만 — SideNav가 캘린더/통계에서 메인 뷰로 보내려면
    크로스-라우트 상태가 필요해 복잡. URL 쿼리가 단순.
  - 프로토타입의 2-nav 구조 유지 — clarify에서 명시적으로 기각됨.

## R6. 통계 화면 — 고정 합성값

- **Decision**: `stats-data.ts`가 KPI·주간 막대·도넛·히트맵 값을 프로토타입과 동일한
  고정 상수/결정론적 생성으로 제공한다. "카테고리별 진행률"도 프로토타입과 동일하게
  **원본 `SAMPLE_TASKS` 상수** 분포로 계산한다(사용자의 live localStorage 할 일 무시).
- **Rationale**: `/speckit-clarify` Q2. 디자인 충실도 우선, 통계는 정적 재현. 히트맵
  `buildHeatmap()`은 프로토타입의 시드 공식 그대로 — 결정론적이므로 스냅샷 테스트 가능.
- **Alternatives considered**: live 데이터 반영 — clarify에서 기각.

## R7. 테스트 전략 — Vitest 2-환경

- **Decision**: 단일 `vitest.config.ts`에 두 종류 테스트.
  - `tests/unit/**` — 노드 환경, `src/lib/**` 순수 모듈 대상(`dates`, `selectors`,
    `reducer`, `persistence`). localStorage는 가벼운 인메모리 목.
  - `tests/components/**` — `jsdom` 환경, `@testing-library/react` +
    `@testing-library/user-event`로 컴포넌트 동작 검증. `tests/setup.ts`가
    `@testing-library/jest-dom` 매처와 localStorage 목을 등록.
  - Next.js `useRouter`/`Link`는 컴포넌트 테스트에서 목으로 대체.
- **Rationale**: Constitution 원칙 I, spec TR-001~TR-004. 순수 로직을 React 없이
  테스트하면 Red 단계가 빠르고 명확하다. 컴포넌트 테스트는 사용자 관점 행위만 검증.
- **베스트 프랙티스**: 각 테스트는 구현 전에 작성하고 실패(Red)를 관찰한 뒤 구현(Green).
  컴포넌트 테스트는 구현 디테일이 아니라 접근 가능한 역할/텍스트로 쿼리.

## R8. Next.js 클라이언트 컴포넌트 경계

- **Decision**: 4개 화면 컴포넌트와 두 Provider, SideNav는 모두 `"use client"`. App
  Router 페이지(`app/**/page.tsx`)와 `app/layout.tsx`는 얇은 셸 — layout이 Provider로
  트리를 감싸고 글로벌 CSS를 import, 각 page는 해당 화면 컴포넌트를 렌더.
- **Rationale**: 상태가 전적으로 클라이언트(localStorage·useReducer)에 있고 상호작용이
  핵심이므로 서버 컴포넌트의 이점이 없다. 경계를 layout/page에 얇게 두면 구조가 단순.
- **Alternatives considered**: 서버 컴포넌트 + 점진적 클라이언트화 — 이 앱엔 서버
  데이터가 없어 복잡도만 증가. 탈락.

## 미해결 항목

없음. 모든 기술 결정이 확정되어 Phase 1(설계)로 진행한다.
