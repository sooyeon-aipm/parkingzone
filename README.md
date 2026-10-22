# 모두의주차장 개선 프로젝트

> **2026-10-23 01:35 KST 최신 상태:** 실제 DB 대상 15곳, 네이버 지도·지번 일치 좌표 15곳 연결. 01:25 수집은 정상 10/미제공 5, 01:35는 정상 8/미제공 7이었다. 01:00 매시간 7일 정리 작업의 성공 로그를 확인했다(실제 만료 삭제 사례는 아직 없음). 공식 확인 상품은 팩토리얼 2개·무신사S1 1개를 10/23 조건으로 연결했다. 기본 화면은 실데이터 전용이다. 아래의 실제 4곳/가상 지도/더미 기본 설명은 이전 단계 기록이며 [현재 실행 안내](prototype/README.md)가 우선한다. 이후 목적지 기준 직선거리와 공식 상품 4시설·6개 연결을 추가했다. 미확인 시설의 상품은 만들지 않는다.

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
| prototype | 설치 없이 실행하는 HTML/CSS/JS와 가상 데이터 |
| research/source-observations | 실제 화면 관찰과 출처. 더미 현황과 분리 |
| 앱_플로우 (원본 표기 유지) | 기존 앱 캡처·개선 스케치·PDF 근거 |
| 루트 WBS_TASK PDF | 인수인계 양식 참고 원본 |

## 실행

```sh
python3 scripts/serve_prototype.py
```

진행자: http://127.0.0.1:8765/?layout=1

참여자: http://127.0.0.1:8765/?participant=1&case=1 (정상), case=2 (지연), case=3 (시각 없음)

다른 컴퓨터에서는 저장소를 받아 같은 명령을 실행합니다. 이 주소는 공개 배포 주소가 아닙니다.

## 실제 DB 현황 화면

`python3 scripts/serve_prototype.py` 실행 후 http://127.0.0.1:8765/?data=live 에서 등록된 4곳의 실제 수집 현황을 본다. 더미 연습은 `?data=demo`다. 주차 현황 외 상품·가격·거리·지도 표식은 가상이다. [화면 연결 인수인계](supabase/SCREEN_CONNECTION_HANDOFF.md)를 따른다.
