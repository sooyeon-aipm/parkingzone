# 온라인 UT 분석 · 구현·배포 인수인계

기준일: 2026-10-26 · 브랜치 `main` · 이벤트 구현 `a77a4fb` · GA4 활성화 `0b5c798`.

최신 상태: GA4 전용 속성·웹 스트림 생성, 측정 ID 연결·공개 배포, Google 수집 응답 HTTP 204·DebugView·실시간 이벤트 수신 확인 완료. 이는 에이전트의 기술 점검이며 실제 참여자 UT는 아직 미진행이다.

## 사용자 결정과 구현

온라인 UT를 Vercel 주소로 진행한다. 최초에는 GA4 속성이 없었고, 사용자가 후속 연결 작업을 요청해 전용 속성을 생성했다. 로그인 없이 5명에게 P01~P05 개별 링크를 전달하는 방식을 사용자가 승인했다. 로컬 행동 저장·파일 내보내기 기능은 추가하지 않았다.

- `prototype/analytics-config.js`: 공개 측정 ID `G-9J66ERM0PK`, 회차 `round_1`, 빌드 `20261026-ga4-1`, 운영 호스트.
- `prototype/analytics.js`: 링크·QA 분류, 고정 속성·값 허용, URL 정제, 태그 로드·차단 처리. 코드 없는 방문에 이전 참여자 코드를 이어붙이지 않는다. 참여자용 새 저장소·로그인은 만들지 않는다.
- `prototype/analytics-ui.js`, `analytics-catalog.js`: 준비 목록의 조작 68그룹·화면 15그룹·정보 노출 22그룹 연결. 이벤트 위임으로 동적 UI를 포함하고 화면·공유 단계·모달을 구분한다.
- `app.js`, `share-flow.js`, `share-address.js`, `parking-map.js`: 기능의 성공·실패·취소·프로토타입 종료 결과 훅. `refresh-policy.js`, `refresh-loop.js`는 기존 요청 공유를 유지하면서 초기·자동·수동·복귀 출처를 전달한다.
- `index.html`: 진입 스크립트 버전과 origin 기준 referrer 설정.

초기에는 ID가 비어 있는 안전한 비활성 상태로 배포했고, 후속 작업에서 새 속성의 실제 ID를 연결했다. ID 제거·태그 차단 시 원래 앱은 계속 사용할 수 있도록 실패 처리를 유지한다.

## 자체 검증

`node --test prototype/*.test.mjs`: **68/68 PASS**. 이 중 신규 분석 테스트 12개는 참여자 분리·잘못된 링크·QA 우선·주소 및 자유 입력 제외·공통 속성 덮어쓰기 방지·매개변수 제한·미설정/차단/전송 실패·페이지뷰 중복·카탈로그 동기화·요청 공유 출처를 검증한다.

Chrome의 실제 앱에서 측정 ID가 비어 있어도 조작 준비가 완료되고 Google tag가 삽입되지 않음을 확인했다. 새 분석 모듈과 기존 앱을 함께 읽는 과정의 일시적 로컬 연결 오류는 새로고침 후 해소되었다.

별도 임시 로컬 서버의 합성 현황·가상 주차권·메모리 수신기로 다음을 관찰했다. 해당 서버의 주입 코드와 데이터는 제품 소스에 포함하지 않았다.

| 확인 | 결과 |
| --- | --- |
| P01 검색·상세·조건 펼침·즐겨찾기·수정 미리보기·선택 완료 | 관찰한 모든 이벤트에 P01·회차·빌드 포함 |
| 검색·수정 본문·공유 이름·공유 설명의 가짜 개인정보 | 기록된 분석 페이로드에 없음 |
| 선택 완료 | `prototype_selection_saved` 1회, 실제 `purchase` 이벤트 없음 |
| 공유 홈→유형→운영→조건→사진 안내→폼 | 단계와 대화상자별 화면 이벤트 구분 |
| 빈 주소 검색 | `ui_validation / empty_query`, 원본 주소 없음 |
| 같은 브라우저에서 P02 링크 진입·새로고침 | P02로 구분, P01 잔존 없음 |
| 시간 선택 | `duration_bucket=h2`, 적용 결과에 `date_bucket=today` |
| QA와 P01을 함께 넣은 링크 | `ut_slot=unassigned`, `traffic_type=technical_test`, 점검 디버그 속성 |

관찰 페이로드를 별도로 대조해 P01 구분·입력 제외·선택 결과 1회·결제 이벤트 없음·25개 이하 속성 수를 검사했다. 원시 기술 증거는 임시 로컬 파일 `/private/tmp/parking-ut-analytics-browser-evidence.json`, `/private/tmp/parking-ut-qa-events.json`, `/private/tmp/parking-ut-selection-check.png`다. 실제 사용자 결과가 아니며 임시 파일의 장기 보관을 보장하지 않는다.

## 완료 경계와 다음 단계

소스 구현·Node 검사·Chrome 대표 흐름 자체 검증·공개 배포·실제 GA4 수신 확인 완료. 전체 요소의 모든 조건 분기·실기기·실제 참여자 UT는 미실행이다. Supabase DB·수집 스케줄은 변경하지 않았다.

설정·대표 수집 확인은 완료했다. 다음은 실제 인터뷰 과업·관찰 방법을 확정하고 참여자별 링크로 진행하는 것이다. 기술 점검과 실제 UT를 분리하는 [설정 명세](../ut/GA4_SETUP.md)와 [5명 참여자 링크](../ut/UT_PARTICIPANT_LINKS.md)를 따른다.

## 최초 공개 배포 확인 — GA4 연결 전 기록

- `a77a4fb`를 `origin/main`에 정상 푸시했다. GitHub의 Vercel 체크가 `success`이며 [해당 배포](https://vercel.com/sooyeon/parkingzone/F5a97BqAZhtf66dvw8xLYvdcFqk6)를 확인했다.
- 공개 주소에서 `index.html`, `app.js`, `analytics.js`, `analytics-ui.js`, `analytics-catalog.js`, `analytics-config.js`가 모두 HTTP 200이고 구현 소스와 바이트 단위로 일치했다.
- Chrome에서 `https://parkingzone.vercel.app/?ut=P01`에 접속해 `aria-busy=false`, 네이버 지도, 현재 주차권 목록, 시설 상세를 확인했다. 실제 구매·예약은 실행하지 않았다.
- 진입 스크립트는 `app.js?v=20261026-ut1`이다. 측정 ID가 비어 있으므로 Google tag가 삽입되지 않는 상태도 확인했다. 이는 GA4 수신 성공이 아니다.
- 임시 공개 배포 증거: `/private/tmp/parking-ut-public-assets.json`, `/private/tmp/parking-ut-public-deployed.png`.

## GA4 연결·실제 수신 확인

- 기존 애널리틱스 계정 `409348112`에 `Parkingzone UT` 속성 `560718699`를 새로 생성했다. 한국 시간·원화, 자동차·소규모 프로젝트, 트래픽·참여 목표로 설정했다. 기존 프로젝트 속성을 수정하지 않았다.
- 웹 스트림 `Parkingzone UT Web` / ID `16205575157` / 측정 ID `G-9J66ERM0PK`, URL `https://parkingzone.vercel.app`. 향상된 측정 OFF를 스트림 세부 화면에서 확인했다.
- 이벤트 범위 맞춤 측정기준 5개 `ut_slot / study_round / traffic_type / screen_id / component_id`를 생성하고 목록의 저장 결과를 확인했다. 일반 보고서 반영은 지연될 수 있다.
- `0b5c798`을 main에 푸시했고 [Vercel 배포](https://vercel.com/sooyeon/parkingzone/4MWtNQvLkLB4D7GSN2tgdEHwUFKQ)가 성공했다. 공개 페이지는 `app.js?v=20261026-ga4-1`, Google tag는 `gtag/js?id=G-9J66ERM0PK`로 로드되었다.
- ID·버전 변경 후 `node --test prototype/analytics.test.mjs` **12/12 PASS**. 앞서 전체 프론트 검사 68/68 PASS 기록과 구분한다.
- Chrome Network의 Google Analytics `g/collect` 요청에서 HTTP **204 No Content**를 확인했다. 요청에 실제 측정 ID, 빌드 `20261026-ga4-1`, `study_round=round_1`, `environment=production`, `traffic_type=technical_test`, `ut_slot=unassigned`가 표시되고 페이지 주소는 쿼리 없는 루트 주소였다.
- 해당 GA4 속성 DebugView에 `page_view`, `app_ready`, `ui_click`, `ui_view`, `ui_impression`, `parking_refresh_result`, `map_load_result`가 도착했다. `ui_click` 매개변수 목록과 `ut_slot=unassigned` 값을 확인했다.
- 실시간 보고서에서도 이벤트와 활성 브라우저 1개가 관찰되었다. 점검 링크와 리허설 링크로 발생한 에이전트 기록이며 실제 참여자 1명이나 실제 UT 성과가 아니다. 실참여자 P01~P05의 원격 결과는 아직 없다.
- 임시 증거: `/private/tmp/parking-ga4-stream-created.png`, `/private/tmp/parking-ga4-custom-definitions.png`, `/private/tmp/parking-ga4-collect-204.png`, `/private/tmp/parking-ga4-debugview-received.png`, `/private/tmp/parking-ga4-realtime-received.png`, `/private/tmp/parking-ga4-reception-check.txt`.

## 2026-10-29 P06 추가

- 사용자 요청으로 기존 회차 `round_1`의 허용 코드를 P01~P06으로 확장했다. P06 링크는 `https://parkingzone.vercel.app/?ut=P06`이다.
- 빌드 식별자를 `20261029-ga4-p06`으로 변경하고 참여자 링크·설정 안내를 갱신했다.
- 자체 검증: `node --test prototype/analytics.test.mjs` 12/12 통과. P01~P06의 페이지뷰·클릭 속성, 새로고침, QA 우선 분류와 P07 거부를 확인했다.
- 이번 검증은 코드와 이벤트 페이로드에 대한 자체 검증이며 실제 P06 참여자의 GA4 수신·UT 결과를 뜻하지 않는다.
