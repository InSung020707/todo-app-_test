# Contract: Tasks Data Layer

**File**: `src/lib/data/tasks.ts`
**Consumed by**: `TasksProvider` only (컴포넌트는 TasksProvider 만 사용).

이 모듈은 `tasks` / `subtasks` 테이블에 대한 유일한 클라이언트 진입점이다. 모든 함수는
RLS를 신뢰하며, `user_id` 를 인자로 받지 않는다(서버가 `auth.uid()` 로 강제).

---

## Types

```ts
import type { Task, Subtask, CategoryId, PriorityId } from '@/lib/types';

/** DB row 표현 — snake_case. 외부에서는 직접 사용하지 않음. */
type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  due: string | null;
  priority: PriorityId;
  category: CategoryId;
  starred: boolean;
  done: boolean;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  created_at: string;
};

export type DataError = {
  message: string;
  code?: string;
};

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError };
```

---

## Functions

```ts
/** 현재 사용자의 모든 할 일 + 하위 작업을 조회. 정렬은 created_at desc (서버),
 *  하위 작업은 sort_order asc. */
listTasks(): Promise<DataResult<Task[]>>;

/** 새 할 일을 생성. id 와 timestamps 는 서버가 부여. */
createTask(input: Omit<Task, 'id' | 'subs'>): Promise<DataResult<Task>>;

/** 할 일 업데이트. partial 패치(예: { done: true }). */
updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'subs'>>): Promise<DataResult<Task>>;

/** 할 일 삭제. 하위 작업은 ON DELETE CASCADE 로 자동 정리. */
deleteTask(id: string): Promise<DataResult<void>>;

/** 하위 작업 추가. */
createSubtask(taskId: string, input: Omit<Subtask, 'id'>): Promise<DataResult<Subtask>>;

/** 하위 작업 업데이트. */
updateSubtask(id: string, patch: Partial<Omit<Subtask, 'id'>>): Promise<DataResult<Subtask>>;

/** 하위 작업 삭제. */
deleteSubtask(id: string): Promise<DataResult<void>>;
```

---

## Row ↔ Domain mapping

`rowToTask(row, subRows)` / `taskToInsert(task)` 두 함수가 단일 매핑 지점.

- `due: string | null` ↔ TS `due: string` (`null` → `''`).
- `subs`: 별도 쿼리(한 round-trip)로 `subtasks where user_id = auth.uid()` 가져와서
  `task_id` 로 그루핑. 또는 `tasks` SELECT 시 `subtasks(*)` 임베디드 셀렉트 사용 가능.

---

## Error mapping

| 상황                                      | message                                   |
|-------------------------------------------|-------------------------------------------|
| RLS 위반(다른 사용자 row 접근 시도)        | "권한이 없습니다." (정상 흐름에서는 발생 X) |
| 네트워크/타임아웃                         | "네트워크 오류가 발생했습니다. 다시 시도해 주세요." |
| 제약 위반(빈 title 등)                    | "필수 항목이 비어있습니다." |
| (기타)                                   | "잠시 후 다시 시도해 주세요." |

---

## Test contract

- `listTasks` — 두 사용자의 mock 클라이언트로 호출 시 각자 자기 row 만 반환됨(격리 — SC-002).
- `createTask` — 성공 시 ok=true 와 서버 부여 id; RLS mock 차단 시 ok=false.
- `updateTask` — partial patch 가 변경된 필드만 갱신하고 나머지는 보존.
- `deleteTask` — 자기 task 삭제 성공; 다른 user task id 로 삭제 시 mock 0행 반환 → ok=true
  이지만 실제로는 변경 0 (RLS 동작).
- `createSubtask` — `user_id` 인자를 받지 않고도 부모 task 의 `user_id` 가 자동 채워짐(트리거).
- `subtask` 자기 사용자만 접근 가능.
- `rowToTask` / `taskToInsert` — `due: '' ↔ null`, snake_case ↔ camelCase 변환 라운드트립
  유닛 테스트.

> 단위 테스트는 mocked supabase client 로 충분. RLS 자체의 동작은 Playwright E2E 의
> 데이터 격리 시나리오로 실증(SC-002).
