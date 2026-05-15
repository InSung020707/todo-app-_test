# Contract: Task Store Public API

**Date**: 2026-05-15 | **Plan**: [../plan.md](../plan.md)

할 일 store가 컴포넌트에 노출하는 계약. 컴포넌트는 이 API만 사용하며 필터링·변형 로직을
재구현하지 않는다(Constitution 원칙 IV). 모든 순수 함수·리듀서는 구현 전 단위 테스트가
선행되어야 한다(원칙 I).

---

## Types (`src/lib/types.ts`)

```ts
export type Theme = 'light' | 'dark';
export type PriorityId = 'high' | 'med' | 'low' | 'none';
export type CategoryId = 'design' | 'dev' | 'meeting' | 'plan' | 'personal';
export type ViewId = 'inbox' | 'today' | 'upcoming' | 'overdue' | 'done';

export interface Subtask { id: string; text: string; done: boolean; }
export interface Task {
  id: string; title: string; due: string; priority: PriorityId;
  category: CategoryId; starred: boolean; done: boolean;
  notes: string; subs: Subtask[];
}
export interface Category { id: CategoryId; name: string; color: string; }
export interface Priority { id: PriorityId; name: string; color: string; }
export interface View { id: ViewId; name: string; icon: string; }
export interface TaskGroup { label: string | null; items: Task[]; }
```

## Pure date helpers (`src/lib/store/dates.ts`)

| Export | Signature | 계약 |
|--------|-----------|------|
| `TODAY` | `Date` | `new Date(2026, 4, 15)` 고정. |
| `TODAY_KEY` | `string` | `'2026-05-15'` 고정. |
| `fmtDay(d)` | `(d: string \| Date) => string` | `'5월 15일'` 형식. |
| `fmtKey(d)` | `(d: Date) => string` | `'YYYY-MM-DD'` 형식. |
| `relDay(key)` | `(key: string) => string \| null` | 오늘/내일/어제/`N일 후`/`N일 전`/`M/D (요일)`. 빈 입력 → `null`. |
| `isOverdue(t)` | `(t: Task) => boolean` | `due` 있음 AND `!done` AND `due < TODAY_KEY`. |
| `isToday(t)` | `(t: Task) => boolean` | `due === TODAY_KEY`. |
| `isUpcoming(t)` | `(t: Task) => boolean` | `due` 있음 AND `due > TODAY_KEY`. |

## Pure selectors (`src/lib/store/selectors.ts`)

| Export | Signature | 계약 |
|--------|-----------|------|
| `filterTasks` | `(tasks: Task[], view: ViewId, categoryId: CategoryId \| null) => Task[]` | `categoryId` 있으면 `category===categoryId && !done`. 아니면 View 규칙(data-model 참조). |
| `groupTasks` | `(tasks: Task[], view: ViewId, categoryId: CategoryId \| null) => TaskGroup[]` | `today` → 지연/오늘 2그룹. `upcoming` → 마감일별 그룹(오름차순). 그 외 → 단일 그룹(label `null`). 빈 그룹은 생략. |
| `viewCount` | `(tasks: Task[], view: ViewId) => number` | `filterTasks(tasks, view, null).length`. |
| `catCount` | `(tasks: Task[], catId: CategoryId) => number` | `category===catId && !done` 개수. |

## Pure reducer (`src/lib/store/reducer.ts`)

```ts
type TaskAction =
  | { type: 'add'; id: string; title: string; categoryHint: CategoryId | null; view: ViewId }
  | { type: 'update'; id: string; patch: Partial<Task> }
  | { type: 'delete'; id: string }
  | { type: 'toggleDone'; id: string }
  | { type: 'toggleStar'; id: string }
  | { type: 'addSub'; taskId: string; subId: string; text: string }
  | { type: 'toggleSub'; taskId: string; subId: string }
  | { type: 'deleteSub'; taskId: string; subId: string };

export function tasksReducer(state: Task[], action: TaskAction): Task[];
```

> `add`/`addSub`는 생성된 `id`/`subId`를 액션 페이로드로 받는다 — 리듀서를 순수·
> 결정론적으로 유지하기 위해 ID 생성을 리듀서 밖(`TasksProvider`)에서 처리한다.

| Action | 계약 |
|--------|------|
| `add` | `title` trim 후 빈 문자열이면 state 변화 없음. 아니면 새 Task를 **맨 앞**에 삽입. `due` = `view==='upcoming'` ? 미래 날짜 : `TODAY_KEY`. `category` = `categoryHint ?? 'dev'`. 나머지 기본값은 data-model 참조. |
| `update` | `id` 일치 Task에 `patch` 병합. 없으면 무변화. |
| `delete` | `id` 일치 Task 제거. |
| `toggleDone` | `id` 일치 Task의 `done` 반전. |
| `toggleStar` | `id` 일치 Task의 `starred` 반전. |
| `addSub` | `text` trim 후 빈 문자열이면 무변화. 아니면 `taskId`의 `subs` 끝에 추가. |
| `toggleSub` | `taskId`/`subId` 일치 Subtask의 `done` 반전. |
| `deleteSub` | `taskId`/`subId` 일치 Subtask 제거. |

> 리듀서는 순수: 같은 입력 → 같은 출력, 입력 불변(새 배열/객체 반환), 부수효과 없음.
> `id` 생성은 reducer 밖(액션 페이로드 또는 주입된 생성기)에서 처리해 결정론 유지.

## Persistence (`src/lib/store/persistence.ts`)

| Export | Signature | 계약 |
|--------|-----------|------|
| `loadTasks` | `() => Task[]` | 키 없음 → `SAMPLE_TASKS` 시드. parse 실패/스키마 불일치 → `SAMPLE_TASKS`. 정상 → 저장값. SSR 가드(`typeof window`). |
| `saveTasks` | `(tasks: Task[]) => void` | `demodev-tasks:tasks`에 JSON 저장. SSR 가드. |
| `loadTheme` | `() => Theme` | 저장값이 `'light'`/`'dark'`면 그 값, 아니면 `'light'`. |
| `saveTheme` | `(theme: Theme) => void` | `demodev-tasks:theme`에 저장. |

## React context API

### `useTasks()` (`src/context/TasksProvider.tsx`)

```ts
interface TasksContextValue {
  tasks: Task[];
  addTask: (title: string, categoryHint: CategoryId | null, view: ViewId) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleDone: (id: string) => void;
  toggleStar: (id: string) => void;
  addSub: (taskId: string, text: string) => void;
  toggleSub: (taskId: string, subId: string) => void;
  deleteSub: (taskId: string, subId: string) => void;
}
```

계약: 마운트 시 `loadTasks()`로 초기화, `tasks` 변경 시 `saveTasks()` 호출(첫 마운트
echo 쓰기 억제). 모든 변형 메서드는 `tasksReducer`로 위임.

### `useTheme()` (`src/context/ThemeProvider.tsx`)

```ts
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}
```

계약: 마운트 시 `loadTheme()`로 초기화, 변경 시 `saveTheme()` + `document.documentElement`의
`data-theme` 속성 갱신.
