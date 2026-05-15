# Implementation Plan: demodev Tasks — 한국어 Todo 웹앱

**Branch**: `001-todo-app` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-todo-app/spec.md`

## Summary

Claude Design 핸드오프 번들(`todo-app`)의 4개 화면(로그인 / 메인 3단 / 캘린더 / 통계)을
Next.js App Router 프로덕션 앱으로 재구현한다. 프로토타입의 React+Babel CDN / 디자인
캔버스 / Tweaks 호스트 프로토콜은 버리고, 시각 출력만 픽셀 충실히 재현한다. 핵심
기술 접근: (1) 할 일 도메인 로직(필터/그룹핑/날짜/리듀서/영속화)을 **순수 모듈**로
분리해 React 없이 단위 테스트 가능하게 만들고, (2) 얇은 React Context 두 개(Tasks,
Theme)로 화면 간 상태를 공유하며, (3) 디자인 토큰 CSS는 번들에서 그대로 가져오고,
(4) 모든 로직·컴포넌트 동작은 TDD(Red-Green-Refactor)로 만든다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), React 18, Vitest, @testing-library/react,
@testing-library/jest-dom, @testing-library/user-event, jsdom
**Storage**: 브라우저 localStorage (백엔드·DB 없음)
**Testing**: Vitest + React Testing Library, jsdom 환경; 순수 로직은 노드 환경 단위 테스트
**Target Platform**: 최신 데스크톱 브라우저 (웹). 모바일 반응형은 범위 밖.
**Project Type**: Web application — 프론트엔드 단일 프로젝트, App Router 페이지는 정적 셸로만 사용
**Performance Goals**: 할 일 CRUD·뷰 전환·테마 전환 등 모든 상호작용이 체감 지연 없이
즉시 반영 (<100ms). 초기 로드는 표준 웹앱 기대치.
**Constraints**: 백엔드 없음 · 오프라인 동작(localStorage) · "오늘" = 2026-05-15 고정 ·
디자인 토큰(`colors_and_type.css`)·스타일(`todo.css`) 시각 출력 그대로 재현
**Scale/Scope**: 단일 사용자, 시드 할 일 ~14건, 화면 4개, 뷰 5종, 카테고리 5종,
우선순위 4단계

## Constitution Check

*GATE: Phase 0 연구 전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 게이트 | 초기 평가 (Phase 0 전) |
|------|--------|------------------------|
| I. Test-First (NON-NEGOTIABLE) | 모든 순수 로직·컴포넌트 동작에 구현 전 실패 테스트가 존재하는가 | PASS — tasks 단계가 각 코드 작업마다 선행 테스트 작업을 둠. 순수 모듈(`src/lib/`) 분리로 테스트가 React 마운트 없이 가능. |
| II. Design Fidelity | 디자인 토큰을 그대로 쓰고 프로토타입 하네스를 배제하는가 | PASS — `styles/colors_and_type.css`는 번들에서 verbatim 복사, `todo.css`는 스타일 규칙 verbatim 이식. DesignCanvas/TweaksPanel/Babel은 제외. |
| III. Simplicity & YAGNI | 백엔드 없음, 추가 추상화 없음 | PASS — 상태관리는 추가 의존성 없이 Context + useReducer. localStorage만. 비기능 보조 컨트롤은 정적 렌더. |
| IV. Component Modularity | 화면/공유 컴포넌트 분리, store는 단일 타입드 API | PASS — `src/components/{login,main,calendar,stats}` + `src/components/shared`, store는 `src/lib/store/`에 순수 모듈로 단일화. |
| V. Accessibility | 시맨틱 HTML·aria·키보드·포커스 | PASS — 프로토타입의 시맨틱 요소·aria-label을 보존, Enter 제출/`:focus-visible` 링 유지. |

**Post-Design 재확인 (Phase 1 후)**: research.md·data-model.md·contracts/ 작성 후 재평가 —
설계가 어떤 원칙도 위반하지 않음. 순수 모듈 경계(`src/lib/store/`)가 원칙 I·IV를
구조적으로 강제하고, 계약 문서(store-api·routes)는 추가 추상화 없이 기존 동작만
형식화함. **결과: PASS, 위반 없음.**

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-app/
├── plan.md              # 이 파일 (/speckit-plan)
├── spec.md              # 기능 명세 (/speckit-specify, /speckit-clarify)
├── research.md          # Phase 0 출력 (/speckit-plan)
├── data-model.md        # Phase 1 출력 (/speckit-plan)
├── quickstart.md        # Phase 1 출력 (/speckit-plan)
├── contracts/           # Phase 1 출력 (/speckit-plan)
│   ├── store-api.md     # 할 일 store 액션·셀렉터 공개 계약
│   └── routes.md        # 라우트 맵 + 화면 UI 계약
├── checklists/
│   └── requirements.md  # 명세 품질 체크리스트
└── tasks.md             # Phase 2 출력 (/speckit-tasks — plan이 만들지 않음)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃: 폰트, 글로벌 CSS, ThemeProvider+TasksProvider
│   ├── page.tsx                  # "/"         → 로그인 화면
│   ├── main/page.tsx             # "/main"     → 메인 3단 화면
│   ├── calendar/page.tsx         # "/calendar" → 캘린더 화면
│   └── stats/page.tsx            # "/stats"    → 통계 화면
├── lib/
│   ├── types.ts                  # Task, Subtask, Category, Priority, ViewId, Theme 타입
│   ├── store/
│   │   ├── sample-data.ts        # SAMPLE_TASKS, CATEGORIES, PRIORITIES, VIEWS 상수
│   │   ├── dates.ts              # TODAY, fmtDay, fmtKey, relDay, isOverdue, isToday, isUpcoming
│   │   ├── selectors.ts          # filterTasks, groupTasks, viewCount, catCount
│   │   ├── reducer.ts            # 순수 리듀서: add/update/delete/toggleDone/toggleStar/subtask CRUD
│   │   └── persistence.ts        # loadTasks/saveTasks/loadTheme/saveTheme + 시드·손상복구
│   └── stats-data.ts             # 통계 화면 고정 합성값 (주간/도넛/히트맵/KPI)
├── context/
│   ├── TasksProvider.tsx         # useReducer(reducer) + localStorage 영속화 effect, useTasks()
│   └── ThemeProvider.tsx         # 테마 상태 + 영속화 + data-theme 적용, useTheme()
├── components/
│   ├── shared/
│   │   ├── Icon.tsx              # 인라인 SVG 아이콘 세트 + GoogleIcon
│   │   ├── SideNav.tsx           # 통합 공유 좌측 네비게이션 (footer에 ThemeToggle)
│   │   ├── ThemeToggle.tsx       # 라이트/다크 토글 (SideNav footer에 렌더)
│   │   ├── Check.tsx             # 체크박스 프리미티브
│   │   └── Popover.tsx           # 인라인 팝오버 (우선순위/카테고리 픽커)
│   ├── login/
│   │   └── LoginScreen.tsx
│   ├── main/
│   │   ├── MainScreen.tsx        # 3단 레이아웃 컨테이너
│   │   ├── TaskList.tsx          # 가운데 리스트 + 추가 입력 + 필터칩 + 그룹
│   │   ├── TaskRow.tsx           # 할 일 행
│   │   └── DetailPanel.tsx       # 우측 상세 패널
│   ├── calendar/
│   │   └── CalendarScreen.tsx    # 월간 그리드 + 날짜 미리보기
│   └── stats/
│       └── StatsScreen.tsx       # KPI + 차트 + 히트맵
└── styles/
    ├── colors_and_type.css       # 디자인 토큰 — 번들에서 verbatim
    └── todo.css                  # 컴포넌트 스타일 — 번들에서 verbatim 이식

tests/
├── setup.ts                      # @testing-library/jest-dom + localStorage mock 셋업
├── unit/                         # 순수 로직 (React 불필요)
│   ├── dates.test.ts
│   ├── selectors.test.ts
│   ├── reducer.test.ts
│   └── persistence.test.ts
└── components/                   # RTL 컴포넌트 동작 테스트
    ├── TasksProvider.test.tsx
    ├── ThemeProvider.test.tsx
    ├── ThemeToggle.test.tsx
    ├── SideNav.test.tsx
    ├── LoginScreen.test.tsx
    ├── TaskList.test.tsx
    ├── TaskRow.test.tsx
    ├── DetailPanel.test.tsx
    ├── MainScreen.test.tsx
    ├── CalendarScreen.test.tsx
    ├── StatsScreen.test.tsx
    └── app.integration.test.tsx

# 루트 설정 파일
package.json · tsconfig.json · next.config.ts · vitest.config.ts
```

**Structure Decision**: 단일 웹 프론트엔드 프로젝트. Next.js App Router를 `src/app/`에
두되, 화면은 모두 클라이언트 컴포넌트(`"use client"`)로 두고 App Router 페이지는 얇은
셸로만 사용한다(상태가 전부 클라이언트·localStorage이므로 서버 렌더링 이점이 없고,
프로토타입과의 동작 동일성이 우선). 도메인 로직은 `src/lib/store/`에 **React 비의존
순수 모듈**로 격리해 Constitution 원칙 I·IV를 구조적으로 보장한다. 상태 공유는 추가
라이브러리 없이 Context + useReducer로 처리한다.

## Complexity Tracking

> Constitution Check 위반이 없으므로 비움.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (없음)    | —          | —                                   |
