# 모두의주차장 개선 프로젝트

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
python3 -m http.server 8765 --bind 127.0.0.1 --directory prototype
```

진행자: http://127.0.0.1:8765/?layout=1

참여자: http://127.0.0.1:8765/?participant=1&case=1 (정상), case=2 (지연), case=3 (시각 없음)

다른 컴퓨터에서는 저장소를 받아 같은 명령을 실행합니다. 이 주소는 공개 배포 주소가 아닙니다.
