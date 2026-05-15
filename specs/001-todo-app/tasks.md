---
description: "Task list for demodev Tasks — 한국어 Todo 웹앱"
---

# Tasks: demodev Tasks — 한국어 Todo 웹앱

**Input**: Design documents from `specs/001-todo-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 테스트는 **필수**다. Constitution 원칙 I(Test-First, NON-NEGOTIABLE)와 spec의
Testing Requirements(TR-001~TR-004)가 `/speckit-tasks`의 "tests optional" 기본값을
무효화한다. 각 코드 작업은 선행 실패 테스트(Red) → 구현(Green) → 정리(Refactor) 순서.

**Organization**: 작업은 user story 단위로 묶여 독립 구현·테스트가 가능하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완료 작업에 의존하지 않음)
- **[Story]**: 해당 user story (US1~US6). Setup/Foundational/Polish은 라벨 없음.
- 모든 작업에 정확한 파일 경로 포함

## Path Conventions

단일 웹 프론트엔드 프로젝트 (plan.md 구조): 소스는 `src/`, 테스트는 `tests/`,
App Router 페이지는 `src/app/`. 모든 경로는 저장소 루트 기준.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 및 기본 구조

- [X] T001 Next.js 15 + TypeScript 프로젝트 초기화 — `package.json`, `tsconfig.json`(strict), `next.config.ts`, `.gitignore` 생성 (저장소 루트)
- [X] T002 [P] Vitest 구성 — `vitest.config.ts`(노드+jsdom 듀얼 환경), `tests/setup.ts`(@testing-library/jest-dom + localStorage 목), `package.json`에 `test`/`test:unit`/`typecheck` 스크립트 추가
- [X] T003 [P] 디자인 토큰 verbatim 복사 — 핸드오프 번들 `colors_and_type.css` → `src/styles/colors_and_type.css`
- [X] T004 [P] 컴포넌트 스타일 verbatim 이식 — 핸드오프 번들 `todo.css` → `src/styles/todo.css` (프로토타입 전용 셀렉터 `.app`·`.dc-*`·`.twk-*` 및 캔버스 오버라이드 제외)
- [X] T005 [P] 공유 타입 정의 — `src/lib/types.ts` (Task, Subtask, Category, Priority, View, Theme, PriorityId/CategoryId/ViewId, TaskGroup)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 user story가 의존하는 핵심 인프라 — 순수 store 로직, 상수, Tasks
컨텍스트, 공유 컴포넌트, App 셸. `data-model.md`·`contracts/store-api.md` 기준.

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어떤 user story도 시작할 수 없다.

- [X] T006 [P] 도메인 상수 — `src/lib/store/sample-data.ts` (CATEGORIES 5종, PRIORITIES 4종, VIEWS 5종, SAMPLE_TASKS 14건) 을 번들 `store.jsx`에서 이식
- [X] T007 [P] 날짜 헬퍼 실패 단위 테스트 작성 — `tests/unit/dates.test.ts` (TODAY 고정, fmtDay/fmtKey/relDay/isOverdue/isToday/isUpcoming) — **실패 확인(Red)**
- [X] T008 날짜 헬퍼 구현 — `src/lib/store/dates.ts` 로 T007 통과(Green)
- [X] T009 [P] 셀렉터 실패 단위 테스트 작성 — `tests/unit/selectors.test.ts` (filterTasks 5뷰+카테고리, groupTasks today/upcoming/단일, viewCount, catCount) — **실패 확인(Red)**
- [X] T010 셀렉터 구현 — `src/lib/store/selectors.ts` 로 T009 통과(Green)
- [X] T011 [P] 리듀서 실패 단위 테스트 작성 — `tests/unit/reducer.test.ts` (add/update/delete/toggleDone/toggleStar/addSub/toggleSub/deleteSub, 공백 제목·서브태스크 거부, 순수성·불변성) — **실패 확인(Red)**
- [X] T012 리듀서 구현 — `src/lib/store/reducer.ts` 로 T011 통과(Green)
- [X] T013 [P] TasksProvider 실패 컴포넌트 테스트 작성 — `tests/components/TasksProvider.test.tsx` (SAMPLE_TASKS 인메모리 초기화, useTasks 변형 메서드가 리듀서로 위임) — **실패 확인(Red)**
- [X] T014 TasksProvider 구현 — `src/context/TasksProvider.tsx` (useReducer + useTasks, 이 단계에서는 SAMPLE_TASKS 직접 초기화 — localStorage는 US6에서) 로 T013 통과(Green)
- [X] T015 [P] 아이콘 컴포넌트 — `src/components/shared/Icon.tsx` (인라인 SVG 세트 + GoogleIcon) 를 번들 `icons.jsx`에서 이식
- [X] T016 [P] 체크박스 프리미티브 — `src/components/shared/Check.tsx`
- [X] T017 [P] 인라인 팝오버 프리미티브 — `src/components/shared/Popover.tsx`
- [X] T018 [P] SideNav 실패 컴포넌트 테스트 작성 — `tests/components/SideNav.test.tsx` (뷰 5개+캘린더+통계+카테고리 5개 렌더, 카운트 배지, 라우트별 활성 상태) — **실패 확인(Red)**
- [X] T019 SideNav 구현 — `src/components/shared/SideNav.tsx` (통합 공유 네비, 뷰→/main 쿼리, 캘린더/통계→라우트, 카테고리→/main?cat=, footer는 테마 토글 슬롯만 비워둠 — 토글은 US6) 로 T018 통과(Green)
- [X] T020 App 루트 레이아웃 — `src/app/layout.tsx` (폰트 메타데이터, `src/styles/*.css` 글로벌 import, TasksProvider로 트리 래핑)

**Checkpoint**: 순수 store 로직·상수·TasksProvider·공유 컴포넌트·App 셸 준비 완료 —
user story 구현 시작 가능.

---

## Phase 3: User Story 1 - 메인 화면에서 할 일을 관리한다 (Priority: P1) 🎯 MVP

**Goal**: 메인 화면에서 할 일 추가·완료 체크·즐겨찾기·뷰/카테고리 전환·필터 칩이
동작한다. 앱의 핵심 사용 흐름.

**Independent Test**: `/main`을 띄워 할 일을 추가(Enter)하고, 완료 체크하고, 뷰를
전환하며 각 뷰에 규칙대로 필터링되는지 확인.

### Tests for User Story 1 ⚠️ (먼저 작성 → 실패 확인)

- [X] T021 [P] [US1] TaskRow 실패 테스트 작성 — `tests/components/TaskRow.test.tsx` (제목·메타·체크·별 렌더, 체크 클릭→done 토글, 별 클릭→starred 토글, 행 클릭→선택, 체크/별 클릭 시 행 선택 전파 차단)
- [X] T023 [P] [US1] TaskList 실패 테스트 작성 — `tests/components/TaskList.test.tsx` (Enter로 추가+입력란 비움, 공백 제목 무시, 필터 칩 전체/높음/즐겨찾기, today/upcoming 그룹 라벨, 빈 상태 메시지, 뷰 헤더)
- [X] T025 [US1] MainScreen 실패 테스트 작성 — `tests/components/MainScreen.test.tsx` (3단 레이아웃, URL 쿼리 `view`/`cat` 반영, SideNav 활성 상태, 리스트가 필터된 할 일 렌더)

### Implementation for User Story 1

- [X] T022 [US1] TaskRow 구현 — `src/components/main/TaskRow.tsx` 로 T021 통과(Green)
- [X] T024 [US1] TaskList 구현 — `src/components/main/TaskList.tsx` (추가 입력·필터 칩·`groupTasks` 렌더·빈 상태) 로 T023 통과(Green)
- [X] T026 [US1] MainScreen 구현 — `src/components/main/MainScreen.tsx` (3단 grid, 쿼리에서 view/cat 파싱, SideNav + TaskList + 빈 DetailPanel 자리표시자 조합) 로 T025 통과(Green)
- [X] T027 [US1] `/main` 라우트 셸 — `src/app/main/page.tsx` 가 MainScreen 렌더

**Checkpoint**: US1 독립 동작 — 메인 화면 할 일 관리 MVP 완성.

---

## Phase 4: User Story 2 - 할 일의 상세 정보를 편집한다 (Priority: P2)

**Goal**: 우측 상세 패널에서 제목·메모 편집, 우선순위·카테고리 팝오버 변경,
즐겨찾기·삭제, 서브태스크 CRUD가 동작한다.

**Independent Test**: 리스트에서 할 일을 선택해 상세 패널을 열고 제목/메모/우선순위/
카테고리를 바꾸고 서브태스크를 추가·체크·삭제한 뒤 리스트 반영을 확인.

### Tests for User Story 2 ⚠️ (먼저 작성 → 실패 확인)

- [X] T028 [P] [US2] DetailPanel 실패 테스트 작성 — `tests/components/DetailPanel.test.tsx` (빈 상태, 선택 시 속성 렌더, 제목·메모 편집→리스트 반영, 우선순위 팝오버, 카테고리 팝오버, 서브태스크 추가/토글/삭제, 진행 막대, 삭제→선택 해제, 즐겨찾기 토글)

### Implementation for User Story 2

- [X] T029 [US2] DetailPanel 구현 — `src/components/main/DetailPanel.tsx` 로 T028 통과(Green)
- [X] T030 [US2] MainScreen에 선택 상태 배선 — `src/components/main/MainScreen.tsx` 갱신(selectedId 상태, DetailPanel 연결), `tests/components/MainScreen.test.tsx`에 선택·삭제 후 빈 상태 케이스 추가

**Checkpoint**: US1 + US2 독립 동작 — 메인 화면 전체 상호작용 완성.

---

## Phase 5: User Story 3 - 캘린더에서 일정을 본다 (Priority: P2)

**Goal**: 월간 그리드로 할 일을 도트와 함께 보고, 이전/다음/오늘로 달을 이동하고,
날짜 클릭 시 우측 미리보기 패널이 표시된다.

**Independent Test**: `/calendar`를 띄워 2026년 5월 6주 그리드, 오늘 강조, 도트,
날짜 클릭→미리보기, 이전/다음/오늘 네비를 확인.

### Tests for User Story 3 ⚠️ (먼저 작성 → 실패 확인)

- [X] T031 [P] [US3] CalendarScreen 실패 테스트 작성 — `tests/components/CalendarScreen.test.tsx` (2026년 5월 6주 42칸, 오늘 강조, 카테고리 도트+제목·"+N개 더", 날짜 클릭→선택+미리보기 패널, 이전/다음/오늘 네비)

### Implementation for User Story 3

- [X] T032 [US3] CalendarScreen 구현 — `src/components/calendar/CalendarScreen.tsx` (SideNav + 월간 그리드 + 날짜 미리보기) 로 T031 통과(Green)
- [X] T033 [US3] `/calendar` 라우트 셸 — `src/app/calendar/page.tsx` 가 CalendarScreen 렌더

**Checkpoint**: US3 독립 동작 — 캘린더 화면 완성.

---

## Phase 6: User Story 4 - 통계 대시보드를 확인한다 (Priority: P3)

**Goal**: KPI 카드·주간 막대·도넛·카테고리 진행률·20주 히트맵을 고정 합성값으로
표시하고 기간 토글이 동작한다.

**Independent Test**: `/stats`를 띄워 4개 KPI·주간 막대·도넛·진행률 바·히트맵 렌더와
기간 토글 선택 상태를 확인.

### Tests for User Story 4 ⚠️ (먼저 작성 → 실패 확인)

- [X] T035 [P] [US4] StatsScreen 실패 테스트 작성 — `tests/components/StatsScreen.test.tsx` (4개 KPI 카드, 주간 막대 차트, 도넛 차트, 카테고리별 진행률 바, 20주 히트맵, 기간 토글 활성 상태)

### Implementation for User Story 4

- [X] T034 [P] [US4] 통계 고정 데이터 — `src/lib/stats-data.ts` (주간 배열·도넛 분포·KPI 수치·결정론적 `buildHeatmap`, 카테고리 진행률은 SAMPLE_TASKS 상수 기준) 을 번들 `screen-stats.jsx`에서 이식
- [X] T036 [US4] StatsScreen 구현 — `src/components/stats/StatsScreen.tsx` (SideNav + KPI 그리드 + 2단 패널 ×2) 로 T035 통과(Green)
- [X] T037 [US4] `/stats` 라우트 셸 — `src/app/stats/page.tsx` 가 StatsScreen 렌더

**Checkpoint**: US4 독립 동작 — 통계 화면 완성.

---

## Phase 7: User Story 5 - 로그인 화면으로 진입한다 (Priority: P3)

**Goal**: 좌측 다크 히어로 + 우측 폼 분할 레이아웃 로그인 화면, 로그인/소셜 버튼이
`/main`으로 이동한다.

**Independent Test**: `/`를 띄워 분할 레이아웃·데모 프리뷰·소셜 버튼·폼 필드·체크박스
렌더와 로그인/소셜 버튼 클릭 시 `/main` 이동을 확인.

### Tests for User Story 5 ⚠️ (먼저 작성 → 실패 확인)

- [X] T038 [P] [US5] LoginScreen 실패 테스트 작성 — `tests/components/LoginScreen.test.tsx` (분할 레이아웃, Google/GitHub 소셜 버튼, 이메일·비밀번호 입력, "로그인 상태 유지" 체크박스 토글, 로그인/소셜 버튼 클릭→`/main` 이동)

### Implementation for User Story 5

- [X] T039 [US5] LoginScreen 구현 — `src/components/login/LoginScreen.tsx` 로 T038 통과(Green)
- [X] T040 [US5] `/` 라우트 셸 — `src/app/page.tsx` 가 LoginScreen 렌더

**Checkpoint**: US5 독립 동작 — 4개 화면 모두 렌더.

---

## Phase 8: User Story 6 - 데이터가 유지되고 테마를 바꾼다 (Priority: P2)

**Goal**: 모든 변경이 localStorage에 영속화되고 새로고침 후 유지되며, SideNav footer
테마 토글로 라이트/다크를 전환하고 그 선택도 유지된다.

**Independent Test**: 할 일을 추가/수정 후 새로고침→유지, 최초 실행→샘플 시드,
테마 다크 전환 후 새로고침→다크 유지를 확인.

### Tests for User Story 6 ⚠️ (먼저 작성 → 실패 확인)

- [X] T041 [P] [US6] persistence 실패 단위 테스트 작성 — `tests/unit/persistence.test.ts` (빈 저장소→SAMPLE_TASKS 시드, 손상 데이터→안전 복구, save/load 라운드트립, theme load/save, SSR 가드)
- [X] T044 [P] [US6] ThemeProvider 실패 테스트 작성 — `tests/components/ThemeProvider.test.tsx` (loadTheme 초기화, toggleTheme→반전+영속화+`data-theme` 속성 갱신)
- [X] T046 [P] [US6] ThemeToggle 실패 테스트 작성 — `tests/components/ThemeToggle.test.tsx` (현재 테마 표시, 클릭→toggleTheme 호출, 접근 가능한 이름)
- [X] T048 [US6] 앱 통합 실패 테스트 작성 — `tests/components/app.integration.test.tsx` (할 일 추가→재마운트→유지, 최초 실행 시드 표시, 테마 토글→`data-theme` 변경→재마운트 후 유지)

### Implementation for User Story 6

- [X] T042 [US6] persistence 구현 — `src/lib/store/persistence.ts` (loadTasks/saveTasks/loadTheme/saveTheme + 시드·손상 복구) 로 T041 통과(Green)
- [X] T043 [US6] TasksProvider에 영속화 배선 — `src/context/TasksProvider.tsx` 갱신(초기화를 `loadTasks()`로, 변경 시 `saveTasks()` effect, 첫 마운트 echo-write 억제), `tests/components/TasksProvider.test.tsx`에 영속화 케이스 추가
- [X] T045 [US6] ThemeProvider 구현 — `src/context/ThemeProvider.tsx` (useTheme) 로 T044 통과(Green); `src/app/layout.tsx`를 ThemeProvider로 추가 래핑
- [X] T047 [US6] ThemeToggle 구현 — `src/components/shared/ThemeToggle.tsx` 로 T046 통과(Green); `src/components/shared/SideNav.tsx` footer에 렌더, `tests/components/SideNav.test.tsx`에 토글 존재 케이스 추가
- [X] T049 [US6] 통합 테스트 통과(Green) — T048 작성분(`tests/components/app.integration.test.tsx`)을 통과시키도록 T043·T045·T047 구현 마무리·조정

**Checkpoint**: US6 동작 — 영속화·시드·테마 토글이 4개 화면 전체에서 검증됨.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 여러 story를 가로지르는 마무리 검증

- [X] T050 [P] `quickstart.md` 수동 검증 시나리오 1~10 실행 및 통과 확인
- [X] T051 전체 게이트 — `npm test`(unit+components 전부), `npm run typecheck`, `npm run build` 모두 통과
- [X] T052 접근성 패스 — 4개 화면의 시맨틱 요소·aria-label·키보드 동작(Enter 할 일/서브태스크 추가, `:focus-visible` 링) 검증 (spec FR-042/FR-043)
- [X] T053 [P] 시각 충실도 패스 — 4개 화면을 라이트·다크에서 핸드오프 번들과 대조 (spec SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작.
- **Foundational (Phase 2)**: Setup 완료에 의존 — 모든 user story를 BLOCK.
- **User Stories (Phase 3~8)**: 모두 Foundational 완료 후 시작 가능.
  - US1(P1) → US2(P2)는 US1에 의존(상세 패널이 메인 화면에 배선됨).
  - US3(P2), US4(P3), US5(P3)는 Foundational만 의존 — 서로 독립, 병렬 가능.
  - US6(P2)는 Foundational만 의존 — 단, 통합 테스트(T048)는 검증 대상 화면이
    존재할 때 더 의미 있음(권장: US1 이후).
- **Polish (Phase 9)**: 모든 원하는 user story 완료에 의존.

### User Story Dependencies

- **US1 (P1)**: Foundational 후 시작 — 다른 story 의존 없음. MVP.
- **US2 (P2)**: US1에 의존 — DetailPanel을 MainScreen에 배선.
- **US3 (P2)**: Foundational만 의존 — 독립.
- **US4 (P3)**: Foundational만 의존 — 독립.
- **US5 (P3)**: Foundational만 의존 — 독립.
- **US6 (P2)**: Foundational만 의존 — TasksProvider/layout/SideNav를 확장.

### Within Each User Story

- 테스트를 먼저 작성하고 **실패(Red)를 확인한 뒤** 구현(Green) — 그 뒤 Refactor.
- 프리미티브·순수 로직 → 컴포넌트 → 화면 조합 → 라우트 셸 순.
- story 완료(테스트 통과 + 전체 스위트 그린) 후 다음 우선순위로.

### Parallel Opportunities

- Setup: T002·T003·T004·T005 병렬 가능 (T001 이후).
- Foundational: T006 및 테스트 작성 작업 T007·T009·T011·T013·T018 병렬 가능;
  프리미티브 T015·T016·T017 병렬 가능. 각 구현 작업은 짝 테스트에 의존.
- Foundational 완료 후: US1·US3·US4·US5·US6를 (인력이 있다면) 병렬 진행 가능;
  US2는 US1 이후.
- 각 story 내 `[P]` 테스트 작성 작업은 병렬 가능.

---

## Parallel Example: Foundational Phase

```bash
# Foundational 테스트 작성 작업을 함께 시작 (T001 셋업 완료 후):
Task: "T007 날짜 헬퍼 실패 단위 테스트 작성 in tests/unit/dates.test.ts"
Task: "T009 셀렉터 실패 단위 테스트 작성 in tests/unit/selectors.test.ts"
Task: "T011 리듀서 실패 단위 테스트 작성 in tests/unit/reducer.test.ts"
Task: "T018 SideNav 실패 컴포넌트 테스트 작성 in tests/components/SideNav.test.tsx"

# 공유 프리미티브를 함께 구현:
Task: "T015 아이콘 컴포넌트 in src/components/shared/Icon.tsx"
Task: "T016 체크박스 프리미티브 in src/components/shared/Check.tsx"
Task: "T017 인라인 팝오버 프리미티브 in src/components/shared/Popover.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (모든 story BLOCK 해제)
3. Phase 3: US1 완료
4. **STOP & VALIDATE**: `/main`에서 할 일 추가·완료·뷰 전환 독립 검증
5. 준비되면 데모

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. US1 추가 → 독립 검증 → 데모 (MVP!)
3. US2 추가 → 메인 화면 상세 편집 완성 → 검증
4. US6 추가 → 영속화·테마 → 검증 (새로고침 유지)
5. US3 → 캘린더 → 검증
6. US4 → 통계 → 검증
7. US5 → 로그인 → 검증
8. Phase 9: Polish — 전체 게이트·접근성·시각 충실도

### Parallel Team Strategy

Foundational 완료 후: 개발자 A=US1→US2, 개발자 B=US3, 개발자 C=US4+US5,
개발자 D=US6. 각 story는 독립 완료·통합.

---

## Notes

- `[P]` = 다른 파일, 의존성 없음.
- `[Story]` 라벨로 작업↔user story 추적.
- 각 user story는 독립 완료·테스트 가능.
- **구현 전 테스트 실패(Red)를 반드시 확인** — Constitution 원칙 I.
- 작업 또는 논리 그룹 단위로 커밋.
- 체크포인트에서 멈춰 story를 독립 검증 가능.
- 회피: 모호한 작업, 같은 파일 충돌, story 독립성을 깨는 교차 의존.
