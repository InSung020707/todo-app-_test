# Quickstart: demodev Tasks — 한국어 Todo 웹앱

**Date**: 2026-05-15 | **Plan**: [plan.md](./plan.md)

개발 환경에서 이 기능을 띄우고 검증하는 절차.

---

## 사전 요구

- Node.js 20+
- npm (또는 pnpm)

## 설치 & 실행

```bash
npm install
npm run dev          # http://localhost:3000 — / (로그인)에서 시작
```

## 테스트 (TDD — Constitution 원칙 I)

```bash
npm test             # Vitest 전체 (tests/unit + tests/components)
npm test -- --watch  # 워치 모드 — Red-Green-Refactor 루프
npm run test:unit    # 순수 로직만 (tests/unit/**)
```

작업 순서는 항상: **실패하는 테스트 작성 → 실패 확인(Red) → 최소 구현(Green) →
정리(Refactor)**. 한 번도 실패한 적 없는 테스트는 신뢰하지 않는다.

## 빌드 & 타입체크

```bash
npm run build        # Next.js 프로덕션 빌드
npm run typecheck    # tsc --noEmit (strict)
```

## 수동 검증 시나리오 (spec 인수 시나리오 매핑)

`npm run dev` 후 브라우저에서:

1. **로그인 (US5)**: `/`에서 좌측 다크 히어로 + 우측 폼 확인 → "로그인 상태 유지"
   토글 → "로그인" 클릭 → `/main`으로 이동.
2. **할 일 추가 (US1)**: 추가 입력란에 제목 입력 + Enter → 리스트 맨 위에 나타나고
   입력란이 비워짐.
3. **완료 토글 (US1)**: 할 일 체크박스 클릭 → 취소선 + "오늘" 뷰에서 사라짐 →
   SideNav "완료" 뷰에서 보임.
4. **뷰/카테고리 전환 (US1)**: SideNav에서 받은편지함/예정/지연/완료 + 카테고리 클릭
   → URL 쿼리 변화 + 각 뷰 규칙대로 필터링. 오늘 뷰는 지연/오늘 그룹, 예정 뷰는
   날짜별 그룹.
5. **필터 칩 (US1)**: "우선순위 높음" / "즐겨찾기" 칩 → 현재 뷰 결과 추가 필터.
6. **상세 편집 (US2)**: 할 일 클릭 → 우측 패널에서 제목/메모 편집(리스트 즉시 반영),
   우선순위·카테고리 팝오버 변경, 서브태스크 추가(Enter)·체크·삭제, 삭제 버튼 →
   패널 빈 상태.
7. **캘린더 (US3)**: SideNav "캘린더" → 2026년 5월 6주 그리드, 오늘(5/15) 강조,
   할 일 도트, 날짜 클릭 → 우측 미리보기, 이전/다음/오늘 네비.
8. **통계 (US4)**: SideNav "통계" → KPI 4카드 + 주간 막대 + 도넛 + 진행률 바 +
   히트맵, 기간 토글.
9. **영속화 (US6)**: 할 일 추가/수정 후 새로고침 → 변경 유지. 테마 다크 전환 후
   새로고침 → 다크 유지.
10. **다크 테마 (US6)**: SideNav footer 테마 토글 → 4개 화면 전체 다크 적용.

## 초기화 / 리셋

브라우저 DevTools → Application → Local Storage → `demodev-tasks:tasks`,
`demodev-tasks:theme` 키 삭제 후 새로고침 → 샘플 데이터로 재시드.

## Definition of Done

- `npm test` 전체 통과 (unit + components).
- `npm run typecheck` 무오류, `npm run build` 성공.
- 위 수동 시나리오 1~10 모두 통과.
- 4개 화면이 라이트·다크에서 핸드오프 번들과 시각적으로 일치.
