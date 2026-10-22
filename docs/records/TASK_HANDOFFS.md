# WBS TASK별 인수인계

PDF 참고 양식의 개요·Status·Summary·Implementation·Acceptance Criteria·Verification·변경 파일·운영 상태·후속 작업을 적용했다. 아래 번호는 로컬 기록 번호이며 Notion 고유 ID가 아니다. 기존 WBS 담당자·우선순위·일정·진행률은 유지한다.

## PZ-001 · 우리 프로젝트에 맞는 DB 컬럼짜기

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
DESIGN_AGREED / REVIEW_PENDING

### Summary
기본정보 5·상태 8·수집 로그 9개 컬럼, NULL·필수값·UUID·FK를 합의했다.

### Implementation
세 테이블 최종 컬럼과 추가 연결 컬럼을 함께 확인한다. SQL 제품별 자료형·길이는 미정이다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
컬럼·관계 문서 대조. 실제 DB 생성·SQL 검증은 미실행.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/design/DB_DESIGN.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연 검토 후 DB 제품·SQL 구현 여부를 정한다.

---

## PZ-002 · 주차장·상태 이력·수집 로그 구조 설계

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
DESIGN_AGREED / REVIEW_PENDING

### Summary
기본정보·시점별 상태·수집 시도를 분리하고 일대다 관계를 정의했다.

### Implementation
collection_attempt_id는 시도 연결, retry_of_id는 재시도 연결이다. 7일 만료 조회 제외·매시간 삭제 및 만료 FK NULL 처리는 설계다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
4/4 설계 묶음 합의. 실제 DB·보관 삭제 작업은 미구현.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/design/DB_DESIGN.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연이 컬럼·실패·보관 규칙을 검토한다.

---

## PZ-003 · 원본 데이터 API 끌어오는 방법 짜기

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
DESIGN_ONLY / COLLECTOR_ON_HOLD

### Summary
공공 API 대상 부족으로 성수동1가·2가의 서울시 주차정보 화면 수집 설계로 전환했다.

### Implementation
수집 시작→원천 읽기→수치·시각 검증→상태/시도 기록→조회 흐름. 접근 실패 30초 후 1회 재시도, 데이터 오류는 재시도 안 함.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
강변 실제 화면 1회 관찰은 기록했다. 전체 시설 ID·원천 갱신 시각·정기 수집 가능성은 미확인.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/design/DB_DESIGN.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
실제 수집기 구축 보류 유지. 운영 수집 주기·원천 식별자·시각 확보를 추후 확인한다.

---

## PZ-004 · 주차장 검색·상세 상태 조회 구현

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE / BACKEND_NOT_IMPLEMENTED

### Summary
가상 JSON에서 검색·정렬·상세 조회와 상태 표시용 양식을 연결했다.

### Implementation
model.js 공통 판정과 app.js 화면 연결. 서버 API나 운영 DB 조회 엔드포인트는 만들지 않았다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
15개 고유 시설·연결 대조, 로컬 화면 검색·상세 흐름 점검.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/model.js

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
백엔드 구현은 별도 결정 후 진행한다.

---

## PZ-005 · 목록·상세의 상태 정보 UI 설계

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE / REVIEW_PENDING

### Summary
목록과 상세에 합의한 혼잡도·갱신 시각 배치를 반영했다.

### Implementation
목록은 배지→이름→바로 우측 시각→거리. 상세는 배지+이름 한 줄, 시각은 아래 중앙. 시각 미확인 축약은 미확인.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
이전 Chrome에서 목록·상세 배치 확인. 취소된 상세 여백 조정은 미적용.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/styles.css

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연의 화면 검토·피드백을 받는다.

---

## PZ-006 · 지연·오류·미지원·검색 결과 없음 화면 설계

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE / SCOPE_PARTIAL

### Summary
지연·원천 시각 없음·수집 실패·최근 기록 없음과 검색 결과 없음을 구분했다.

### Implementation
지연/실패는 마지막 유효 기록+주의, 시각 없음은 현재 판단 금지, 기록 없음은 정보 없음. 미지원 별도 원천 분류는 추가 합의가 필요하다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
이전 로컬 모델의 경계·예외와 Chrome 시나리오 점검. 실제 원천별 미지원 연동은 미실행.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/STATE_REVIEW.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
미지원 정의·운영 연동이 필요해질 때 범위를 확정한다.

---

## PZ-007 · 프로토타입 이미지, 유저플로우 실제 동작 프로토타입 구현

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE_READY / REVIEW_PENDING

### Summary
기존 앱 캡처와 개선 스케치를 참고해 HTML/CSS/JS 동작 프로토타입을 작성했다.

### Implementation
15개 시설 더미, 지도·목록·검색·정렬·상세·가상 구매 종료, 정상/지연/시각 없음 참여자 보기.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
이전 Chrome에서 3상황·구매 종료·초기화·모바일 크기 표시 점검. 실제 기기·사용자 UT 미실행.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/README.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연 최종 검토 후 실제 UT로 넘어간다.

---

## PZ-008 · 기존 탐색·상세 흐름을 재현한 프로토타입 구현

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE / REVIEW_PENDING

### Summary
기존 앱 일반 주차권의 구매 전 탐색·상세 흐름을 캡처 기준으로 재현했다.

### Implementation
기존안/개선안은 같은 가상 시설·상품을 사용한다. 앱 전체·픽셀 완전 일치·로그인·공유면·결제는 범위 밖이다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
이전 Chrome에서 모드 전환·목록 복귀·선택 보존·초기화 확인.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/COMPARE_REVIEW.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연이 재현 범위와 UT 사용 적합성을 검토한다.

---

## PZ-009 · 상태 배지·갱신 시각·예외 안내 연동

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
LOCAL_PROTOTYPE / REVIEW_PENDING

### Summary
5단계 상태와 최신성·실패 안내를 공통 모델로 연결했다.

### Implementation
반올림 점유율 0–39/40–59/60–79/80–99/100. 20분 초과 지연, UTC 저장 예시·KST 표시. 원천 시각과 수집 시각을 구분한다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
이전 모델 경계·예외 검사 및 Chrome 표시 확인. 20분 기준은 프로토타입 임시값이다.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/prototype/model.js

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
운영 최신성 기준·실제 수집 연동은 별도 검토한다.

---

## PZ-010 · 정상·지연·오류·누락 시나리오 점검

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
AI_LOCAL_CHECKED / TEAM_REVIEW_PENDING

### Summary
모델 경계·예외와 주요 화면 상호작용을 로컬에서 점검했다.

### Implementation
정상·지연·시각 없음·실패·기록 없음·7일 만료·잘못된 면수·미래 시각, 구매 중복 방지·초기화·참여자 보기.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
과거 AI 자체 검사이며 독립 QA·실제 기기·사용자 UT 성공을 뜻하지 않는다. 이번 폴더 정리 뒤 문법·경로 검사를 별도 기록한다.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/review/FINAL_REVIEW.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연 검토와 팀 재현, 실제 UT는 별도로 진행한다.

---

## PZ-011 · 기존안과 개선안 비교 UT 진행

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
NOT_RUN / PLAN_PREPARED

### Summary
실제 UT는 미진행이며, 개선안의 정보 이해도를 먼저 확인하는 설계와 참여자 보기를 준비했다.

### Implementation
정상·지연·시각 없음 3상황에서 상태 의미·기준 시점·입차 보장 여부를 관찰한다. 개선안 이해도 먼저, 기존안 비교는 후속이다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
실제 참가자 결과·성공률·속도 개선 근거 없음. localStorage 점검 기록은 UT 성과가 아니다.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/ut/UT_DESIGN.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
수연 검토 후 모집·진행·관찰 결과를 기록한다.

---

## PZ-012 · 주차장 리스트 (서울특별시 주차정보안내시스템)

### 작업 개요·기본 정보
- 작업일: 2026-10-22 / 대상 브랜치: main / 기준 리비전: 7ad7233
- 작업 주체: 팀의 선택·합의를 바탕으로 AI가 문서·프로토타입 작성 및 자체 점검. 담당자 속성은 기존 WBS 유지.
- 환경: 로컬 정적 웹·가상 JSON·브라우저 localStorage. 운영 DB·정기 수집기 없음.

### Status
SOURCE_LIST_PREPARED / LIVE_COVERAGE_UNVERIFIED

### Summary
사용자 제공 성수동1가·2가 15개 시설 이름·주소를 원문으로 보존했다.

### Implementation
대상 목록과 가상 면수·상품·가격·거리·시각을 분리했다. 실제 운영 현황이나 판매 정보로 주장하지 않는다.

### Acceptance Criteria
위 산출물·합의 범위를 검토할 수 있다. 수연 승인·실제 운영·UT 완료와 구분한다.

### Verification
강변 단일 화면 관찰·성수 일반 지도 캡처 출처 기록. 15개 전체 실시간 제공 여부 재검증은 미실행.

### 변경 파일·산출물
https://github.com/sooyeon-aipm/parkingzone/blob/main/docs/design/PARKING_SOURCE_LIST.md

### 배포 및 운영 상태
로컬 프로토타입. 공개 서비스 배포·실시간 연동·실제 결제 없음. 유미·종현의 기존 결과물 확인은 사용자 보고이며 참여자 보기 후속 변경은 AI 점검이다. 수연 검토 대기.

### 후속 작업
전체 원천 식별자·갱신 시각 확보 여부는 운영 수집 검토 시 확인한다.
