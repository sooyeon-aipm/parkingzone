# 온라인 UT 분석 · 로컬 구현 인수인계

기준일: 2026-10-26 · 브랜치 `main` · 기반 커밋 `14eeb05` 이후 작업트리.

## 사용자 결정과 구현

온라인 UT를 Vercel 주소로 진행할 예정이며 GA4 속성은 아직 없다. 로그인 없이 5명에게 P01~P05 개별 링크를 전달하는 방식을 사용자가 승인했다. 로컬 행동 저장·파일 내보내기 기능은 추가하지 않았다.

- `prototype/analytics-config.js`: 공개 측정 ID 입력 위치, 회차 `round_1`, 빌드 `20261026-ut1`, 운영 호스트.
- `prototype/analytics.js`: 링크·QA 분류, 고정 속성·값 허용, URL 정제, 태그 로드·차단 처리. 코드 없는 방문에 이전 참여자 코드를 이어붙이지 않는다. 참여자용 새 저장소·로그인은 만들지 않는다.
- `prototype/analytics-ui.js`, `analytics-catalog.js`: 준비 목록의 조작 68그룹·화면 15그룹·정보 노출 22그룹 연결. 이벤트 위임으로 동적 UI를 포함하고 화면·공유 단계·모달을 구분한다.
- `app.js`, `share-flow.js`, `share-address.js`, `parking-map.js`: 기능의 성공·실패·취소·프로토타입 종료 결과 훅. `refresh-policy.js`, `refresh-loop.js`는 기존 요청 공유를 유지하면서 초기·자동·수동·복귀 출처를 전달한다.
- `index.html`: 진입 스크립트 버전과 origin 기준 referrer 설정.

측정 ID는 의도적으로 비어 있다. 이 상태에서는 GA4 태그·행동 전송·노출 관찰이 시작되지 않으며 원래 앱은 사용할 수 있다. GA4 ID를 받은 뒤 해당 설정을 바꾸고 최종 배포 주소에서 실제 수신을 검사해야 한다.

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

소스 구현·Node 검사·Chrome 대표 흐름 자체 검증 완료. 커밋·푸시·이번 변경의 Vercel 배포는 하지 않았다. 전체 요소의 모든 조건 분기·실기기·실제 GA4 수신·실제 참여자 UT는 미실행이다. Supabase DB·수집 스케줄은 변경하지 않았다.

다음은 GA4 속성 생성 → 공개 측정 ID 입력 → 이벤트 범위 측정기준 `ut_slot / study_round / traffic_type / screen_id / component_id` 등록 → 배포 버전 대조 → Network·DebugView·Realtime 수신 확인이다. [설정 명세](../ut/GA4_SETUP.md)와 [5명 참여자 링크](../ut/UT_PARTICIPANT_LINKS.md)를 따른다.
