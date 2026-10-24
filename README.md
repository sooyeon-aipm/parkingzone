# 모두의주차장 개선 프로젝트

> **현재 작업트리 기준: 2026-10-24.** 실제15시설 현황·네이버지도에 조회/시트/검색조건/요금/메뉴 개선을 로컬 반영했다. 최신 반영 여부는 Git 커밋과 Vercel 배포 결과를 구분해 확인한다. [실행·현재 범위](prototype/README.md), [개선 플랜](docs/design/DEPLOYED_PROTOTYPE_IMPROVEMENT_PLAN.md), [검증 기록](docs/records/DEPLOYED_IMPROVEMENT_PROGRESS.md)을 함께 확인한다. 과거 구현·검증 시점의 기록을 현재 운영 상태로 해석하지 않는다.

구매 전 주차 상태·갱신 시각·불확실성을 이해하도록 개선하는 팀 학습 프로젝트입니다.

## 먼저 읽기

1. [팀 인수인계·현재 상태](TEAM_HANDOFF.md)
2. [DB·수집 설계](docs/design/DB_DESIGN.md)
3. [프로토타입 실행](prototype/README.md)
4. [수연 검토 자료](docs/review/SUYEON_REVIEW.md)
5. [개발 작업 기록서](docs/records/DEVELOPMENT_LOG_2026-10-22.md)
6. [TASK별 인수인계](docs/records/TASK_HANDOFFS.md)

## 폴더 안내

| 위치 | 내용 |
| --- | --- |
| docs/design | DB·수집·프로토타입 설계와 대상 시설 목록 |
| docs/review | 진행도 기준, 마감 점검, 팀·수연 검토 |
| docs/ut | 실제 UT 전 설계·관찰 양식 |
| docs/records | 개발기록·TASK 인수인계·노션 반영 내역 |
| docs/baseline | 과거 PRD·유저플로우 원본. 현재 정책과 구분 |
| docs/history | 대화 순서의 인수인계·이전 WBS 검토 스냅샷 |
| prototype | HTML/CSS/JS 실행 화면·실제 현황 연결·검증된 수동 시설/요금 카탈로그 |
| research/source-observations | 실제 화면 관찰과 출처. 더미 현황과 분리 |
| 앱_플로우 (원본 표기 유지) | 기존 앱 캡처·개선 스케치·PDF 근거 |
| 루트 WBS_TASK PDF | 인수인계 양식 참고 원본 |

## 실행

```sh
python3 scripts/serve_prototype.py
```

브라우저: http://127.0.0.1:8765

이미 서버가 실행 중이면 새로 시작하지 않고 브라우저만 연다. HTML 직접 열기나 일반 정적 서버만으로는 현황 API가 연결되지 않는다. 다른 컴퓨터에서도 같은 명령을 사용한다. 네트워크/API 접근과 네이버 콘솔 허용 도메인이 필요하다.

## 현재 연결과 검증 경계

- 실제 15시설의 면수·원천시각·수집결과를 `/api/parking`으로 읽는다. 과거 더미·비교 모드는 현재 실행 경로가 아니다.
- 네이버 지도는 기존 공개 Client ID와 콘솔의 허용 도메인 방식을 유지한다. 지도 때문에 환경변수를 새로 만들지 않는다.
- 오늘(2026-10-24) 확인 주차권은5시설16개, 현장 요금은14/15곳 입력했다. 이 수치는 전체 판매/요금 대조 완료를 뜻하지 않는다. 일부는 ‘서울시 기준·모두의주차장 미대조’이며 충돌 항목은 보류했다.
- 상품은 확인 날짜에만 표시하므로 날짜가 달라지면 확인 상품이 없을 수 있다. 가격 자동 수집과 미래 판매 보장은 구현하지 않았다.
- 미리보기·실제 아이폰 Safari·AI/일부 내 공유 분기 및 팀 UT는 별도 확인이 남아 있다. 자세한 내용은 실행 안내와 검증 기록을 따른다.
