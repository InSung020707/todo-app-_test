# Phase 1 Data Model: demodev Tasks — 한국어 Todo 웹앱

**Date**: 2026-05-15 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

모든 데이터는 클라이언트 메모리(`useReducer` 상태)에 존재하고 localStorage에 영속화된다.
타입은 `src/lib/types.ts`에 정의한다. 형태는 핸드오프 번들 `store.jsx`의 데이터 구조를
그대로 따른다.

---

## Entity: Task (할 일)

하나의 할 일 항목. 앱의 핵심 엔티티.

| Field | Type | 제약 / 규칙 |
|-------|------|-------------|
| `id` | `string` | 고유. 시드 데이터는 `t1`..`t14`, 신규는 `t` + 랜덤 6자(`'t' + Math.random().toString(36).slice(2,8)`). |
| `title` | `string` | 사용자 표시 제목. 추가 시 공백만이면 거부(FR-011), 저장 시 trim. |
| `due` | `string` | 마감일 `'YYYY-MM-DD'` 또는 `''`(없음). 빈 문자열이면 날짜 기반 뷰(예정/지연/오늘)에서 제외. |
| `priority` | `Priority['id']` | `'high' \| 'med' \| 'low' \| 'none'` 중 하나. 신규 기본값 `'none'`. |
| `category` | `Category['id']` | `'design' \| 'dev' \| 'meeting' \| 'plan' \| 'personal'` 중 하나. 신규 기본값: 활성 카테고리 필터가 있으면 그 값, 없으면 `'dev'`. |
| `starred` | `boolean` | 즐겨찾기 여부. 신규 기본값 `false`. |
| `done` | `boolean` | 완료 여부. 신규 기본값 `false`. |
| `notes` | `string` | 자유 메모. 신규 기본값 `''`. |
| `subs` | `Subtask[]` | 서브태스크 목록. 신규 기본값 `[]`. |

**Relationships**: `category` → Category(다대일), `priority` → Priority(다대일),
`subs` → Subtask(일대다, 소유).

**Lifecycle / State transitions**:
- 생성: `addTask(title)` → 리스트 맨 앞에 삽입, 즉시 선택 대상이 됨.
- 완료 토글: `done` false ↔ true. 완료 시 오늘/예정/지연/카테고리 뷰에서 사라지고
  완료 뷰에 나타남.
- 즐겨찾기 토글: `starred` false ↔ true.
- 편집: `title`/`notes`/`priority`/`category`/`due` 부분 갱신.
- 삭제: 목록에서 제거. 현재 선택 항목이면 선택 해제(상세 패널 빈 상태).

## Entity: Subtask (서브태스크)

한 Task에 속한 체크리스트 항목.

| Field | Type | 제약 / 규칙 |
|-------|------|-------------|
| `id` | `string` | Task 내 고유. 시드는 `s1`..`s9`, 신규는 `'s' + Math.random().toString(36).slice(2,8)`. |
| `text` | `string` | 항목 텍스트. 추가 시 공백만이면 거부(FR-030), 저장 시 trim. |
| `done` | `boolean` | 완료 여부. 신규 기본값 `false`. |

**Relationships**: 부모 Task에 소유됨(부모 삭제 시 함께 삭제).

**Lifecycle**: 추가(Enter) → 완료 토글 → 삭제. 진행률 = `done 개수 / 전체 개수`.

## Entity: Category (카테고리) — 고정 상수

색상 태그. 사용자 정의 불가, 고정 5종(`src/lib/store/sample-data.ts`).

| id | name | color |
|----|------|-------|
| `design` | 디자인 | `#b38ae6` |
| `dev` | 개발 | `#1571f3` |
| `meeting` | 회의 | `#27c961` |
| `plan` | 기획 | `#ffb547` |
| `personal` | 개인 | `#9aa0aa` |

## Entity: Priority (우선순위) — 고정 상수

4단계. 고정(`src/lib/store/sample-data.ts`).

| id | name | color (CSS var) |
|----|------|-----------------|
| `high` | 높음 | `var(--color-danger)` |
| `med` | 보통 | `var(--color-warning)` |
| `low` | 낮음 | `var(--color-accent)` |
| `none` | 없음 | `transparent` |

## Entity: View (뷰) — 고정 상수

할 일 목록을 거르는 관점. 좌측 SideNav 상단 항목(`src/lib/store/sample-data.ts`).

| id | name | icon | 필터 규칙 |
|----|------|------|-----------|
| `inbox` | 받은편지함 | `inbox` | 미완료 전체 |
| `today` | 오늘 | `today` | 미완료 AND (마감 == 오늘 OR 마감 < 오늘) |
| `upcoming` | 예정 | `upcoming` | 미완료 AND 마감 > 오늘 |
| `overdue` | 지연 | `overdue` | 미완료 AND 마감 < 오늘 |
| `done` | 완료 | `done` | 완료 전체 |

> 카테고리 필터가 활성이면 뷰 규칙을 무시하고 `category == 활성 && !done`을 적용한다
> (프로토타입 `filterTasks` 동작과 동일).

## Entity: ThemePreference (테마 설정)

| Field | Type | 제약 / 규칙 |
|-------|------|-------------|
| `theme` | `'light' \| 'dark'` | 기본값 `'light'`. localStorage 영속화. `document.documentElement[data-theme]`에 반영. |

## Persisted Shape (localStorage)

| Key | Value |
|-----|-------|
| `demodev-tasks:tasks` | `Task[]`의 JSON 직렬화 |
| `demodev-tasks:theme` | `'light'` 또는 `'dark'` 문자열 |

**손상 복구 규칙**: `tasks` 키의 `JSON.parse` 실패, 또는 결과가 배열이 아니거나 각
항목이 `Task` 필수 필드를 갖추지 못하면 → `SAMPLE_TASKS`로 초기화(FR-008, TR-003).
`theme` 키가 `'light'`/`'dark'`가 아니면 → `'light'`.

## Derived (계산값, 저장 안 함)

- **그룹(Group)**: `groupTasks(tasks, view, activeCat)` — `{ label: string|null, items: Task[] }[]`.
  - `today` 뷰: `지연 · N` 그룹 + `오늘 · N` 그룹.
  - `upcoming` 뷰: 마감일별 그룹, 라벨은 `relDay(date) · N`.
  - 그 외: 단일 그룹, 라벨 `null`.
- **카운트**: `viewCount(tasks, viewId)`, `catCount(tasks, catId)` — SideNav 배지.
- **서브태스크 진행률**: `done 개수 / 전체` (백분율).

## 통계 화면 데이터 (별도, 비영속·고정)

`src/lib/stats-data.ts`의 고정 합성값 — 사용자 Task 데이터와 무관(clarify Q2).
주간 막대 배열, 도넛 분포, 20주 히트맵(`buildHeatmap()` 결정론적 생성), KPI 수치.
"카테고리별 진행률"만 원본 `SAMPLE_TASKS` 상수 분포로 계산.
