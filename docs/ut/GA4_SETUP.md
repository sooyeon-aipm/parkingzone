# 온라인 UT · GA4 설정 준비

작성일: 2026-10-26 · 구현 기준: 로컬 `main`, `14eeb05` 이후 작업트리.

**현재 상태: 참여자별 링크·공통 GA4 모듈·전체 조작 요소의 이벤트 연결을 로컬 구현했다.** 사용자 확인: 온라인 UT에서 Vercel 배포 주소 사용 예정, 기존 GA4 속성 없음. GA4 속성 생성·측정 ID 발급·이번 변경의 배포·실제 GA4 수신 확인은 아직 하지 않았다. 측정 ID가 비어 있으면 태그를 불러오거나 이벤트를 저장·전송하지 않는다. 로컬 행동 기록·파일 내보내기 기능은 추가하지 않았다.

사용자가 승인한 참여자별 링크 방식은 [참여자 링크·진행 안내](UT_PARTICIPANT_LINKS.md)를 따른다. 구현 파일은 `prototype/analytics-config.js`, `analytics.js`, `analytics-ui.js`, `analytics-catalog.js`다. 아래 설계 명세와 실제 검증 범위를 구분한다.

## 1. 현재 프로젝트

프로젝트 경로: `/Users/b/Documents/Antigravity/parkingzone`.

| 위치 | 역할 | 이벤트를 연결할 지점 |
| --- | --- | --- |
| `prototype/index.html`, `styles.css` | 모바일 웹 구조·스타일 | 고정 버튼, 탭, 화면, 필터 |
| `prototype/app.js` | 지도·검색·목록·상세·즐겨찾기·이용권·선택 종료 | 화면 전환, 동적 요소, 실제 처리 결과 |
| `prototype/parking-map.js` | 네이버 지도·시설 마커 | 마커 선택, 지도 이동 종료·확대, SDK 결과 |
| `prototype/facility-sheet.js` | 시설 유형·주차권·이용 조건 | 동적 구매 버튼과 조건 펼침 |
| `prototype/bottom-sheet.js` | 목록·상세 시트 드래그·터치·휠 | 펼침·접힘·닫힘 확정 시점 |
| `prototype/share-flow.js` | 내 공유 등록 모형 | 단계·선택·입력 유무·사진 선택·로컬 검토 |
| `prototype/share-address.js`, `current-location.js` | 주소 검색·지도 확인·위치 권한 | 요청·결과·취소·오류 분기 |
| `prototype/model.js`, `catalog.js`, `pass-catalog.js` | 현황 판정·시설 및 주차권 데이터 결합 | 화면에 실제 표시한 상태 값 |
| `api/parking.js` | Vercel의 읽기 전용 현황 프록시 | 프론트 요청 완료·실패 시점에서 측정 |
| `scripts/serve_prototype.py` | 로컬 실행 서버·현황 프록시 | 개발 점검용. UT 배포 주소와 구분 |
| `supabase/` | 현황·주차권 수집 함수·DB·운영 SQL | 이번 행동 분석 준비에서 변경 없음 |
| `docs/ut/UT_DESIGN.md` | 과거 정보 이해도 UT 설계 | 현재 실데이터 실행 방식에 맞춘 후속 조정 필요 |
| `vercel.json` | `/api/parking` 및 `prototype` 경로 연결 | GA4 태그는 배포된 웹에서 실행 |

React/Next.js나 `package.json`이 없는 ES 모듈 기반 HTML/CSS/JavaScript 프로젝트다. 고정 화면 외에도 JS에서 버튼과 폼을 생성하므로 문서 캡처 리스너와 명시적 처리 결과 훅을 함께 사용한다. GA4 로더와 이벤트 연결은 추가했지만 측정 ID는 비어 있다. 기존 `parkingzone-ut-selections-v1`은 선택 결과를 이 브라우저에 저장하는 기능이며 원격 행동 분석이 아니다.

기본 실행은 실제 현황을 읽으며, 기존 문서의 가상 데이터·고정 시각·기존안 비교 설명을 현재 UT에 그대로 적용하면 안 된다. 이번에는 운영 API·DB·스케줄·Vercel의 현재 가동 상태를 재검증하지 않았다.

## 2. 새 GA4 속성 설정안

아래는 **속성 생성 전 설정안**이다. 사용자 계정에서 GA4 관리 권한으로 생성한 뒤 `prototype/analytics-config.js`의 `measurementId`에 공개 측정 ID를 입력한다. Measurement Protocol API secret이나 서비스 계정 키는 필요하지 않다.

| 항목 | 준비 값 |
| --- | --- |
| 속성 이름 | `Parkingzone UT` |
| 보고 시간대 | 대한민국 · `Asia/Seoul` |
| 통화 | 대한민국 원 · `KRW` |
| 데이터 스트림 | 웹 · `Parkingzone UT Web` |
| 웹사이트 URL | 기존 프로젝트 문서의 `https://parkingzone.vercel.app` — UT 안내 전 실제 사용할 배포 주소 확인 |
| 측정 ID | 미발급 · `G-…` |
| 연결 방식 | 공통 JS 모듈에서 Google tag 직접 연결 제안. GTM과 중복 설치하지 않음 |
| 향상된 측정 | 이번에는 끄고 필요한 이벤트를 명시적으로 수집하는 설정 제안. 자동 폼·사이트 검색 수집으로 입력값이 섞이지 않게 함 |
| 광고 관련 기능 | UT에는 광고 연결·Google Signals·광고 개인화 기능을 추가하지 않음 |
| 개발자 점검 | `debug_mode`는 점검 기기에서만 사용. 실제 UT에는 제거 |
| 테스트 구분 | `traffic_type=technical_test / rehearsal / ut / general` |

생성 순서:

1. GA4 관리에서 사용할 계정을 고르고 위 시간대·통화로 속성을 생성한다.
2. 웹 데이터 스트림에 최종 Vercel 주소를 입력하고 측정 ID를 확인한다.
3. 향상된 측정 설정을 확인하고, 아래 사용자 정의 측정기준을 등록한다.
4. 측정 ID를 공통 분석 설정에 연결한 뒤 로컬·시험 배포에서 검증한다.
5. 실제 UT에 보낼 주소에서 수신까지 확인한 뒤 링크를 전달한다.

Google tag의 `send_page_view:false`와 명시적 `page_view` 1회 방식으로 중복을 막는다. `page_location`은 쿼리·해시를 제거한 주소로, `page_referrer`는 출처 도메인만 전달한다. 내부 화면 전환은 별도 `ui_view`로 구분한다. 원본 URL·referrer가 자동 페이지뷰나 자동 이벤트로 먼저 전송되지 않게 태그 초기화 순서를 점검한다.

GA4에는 [이벤트 설정](https://developers.google.com/analytics/devguides/collection/ga4/events), [수집 제한](https://support.google.com/analytics/answer/9267744?hl=en), [개인 식별 정보 제외](https://support.google.com/analytics/answer/6366371?hl=en), [사용자 정의 측정기준](https://support.google.com/analytics/answer/14240153?hl=en), [DebugView](https://support.google.com/analytics/answer/7201382?hl=en)의 공식 기준을 적용한다. 2026-10-26 확인 기준 이벤트·매개변수 이름은 40자 이내, 이벤트당 매개변수는 25개 이내로 구성한다.

## 3. 전체 컴포넌트 수집 기준

코드 위치·CSS 선택자·고정 이벤트 식별자는 [EVENT_CATALOG.json](EVENT_CATALOG.json)에 정리했다. 해당 선택자를 `analytics-catalog.js`에 연결했다. 전체 목록의 모든 조건 분기를 실제 브라우저에서 실행한 것은 아니므로 목록과 대표 흐름 검증을 구분한다.

- 버튼·카드·탭·필터: `ui_click` 또는 `ui_change`. 아이콘·내부 글자를 클릭해도 부모 조작 요소 하나로 기록한다.
- 입력: `ui_field_commit`. 입력을 수정한 뒤 포커스를 떠날 때 한 번 기록하며, 속성에는 입력 유무만 담는다. 글자마다 이벤트를 보내거나 입력 내용을 보내지 않는다.
- 폼: `ui_submit`은 시도, 별도 결과 이벤트는 실제 처리 결과다. Enter 제출과 버튼 클릭은 같은 제출을 두 번 세지 않는다.
- 화면·대화상자: 실제 활성 화면이 바뀔 때 `ui_view`. 뒤에 가려진 화면을 동시에 활성 화면으로 세지 않는다.
- 상태·갱신 시각·가격·안내·빈 결과: `ui_impression`. 활성 화면에서 요소의 50% 이상이 1초 동안 실제 보일 때 기록하는 기준을 제안한다. 이는 읽거나 이해했다는 뜻이 아니다.
- 스크롤: `ui_scroll`에 목록·상세·폼별 25/50/75/100% 도달을 한 화면 방문당 한 번 기록한다. 스크롤할 수 없는 영역에는 만들지 않는다.
- 시트·지도: 매 프레임이 아니라 조작 종료 후 확정된 펼침·접힘·닫힘, 지도 이동·배율 변화를 기록한다. 좌표는 보내지 않는다.
- 비활성 버튼: 실제 클릭을 수집하지 않는다. 이용 불가 노출은 `ui_impression`의 `enabled=false`와 사유로 분리한다.
- 입력 검증: `ui_validation`. 필수 입력 누락·과거 날짜 등 실제 거절 시점의 고정 사유만 기록하며 원본 입력은 제외한다.
- 장식 아이콘·여백·중복 문구는 독립 클릭 이벤트를 만들지 않고 해당 정보 블록의 노출로 다룬다. SDK 내부 장식 UI까지 무차별로 수집하지 않는다.

## 4. 공통 데이터 계약

임의의 DOM 텍스트나 `dataset` 전체를 전송하지 않는다. 고정 목록에 있는 속성과 값만 허용한다. 아래 공통 값 9개와 추가 속성을 조합하며 주소·전송 설정·디버그 속성까지 합쳐 최대 25개로 제한한다.

| 공통 속성 | 값·설명 |
| --- | --- |
| `schema_version` | `pz_ut_v1` |
| `app_version` | 배포 시 지정한 커밋 또는 고정 빌드 식별자 |
| `environment` | `local / preview / production` · 확인한 호스트 설정으로 분류 |
| `traffic_type` | `technical_test / rehearsal / ut / general` · UT 안내 링크와 점검 링크 구분 |
| `study_round` | `pilot / round_1` 등 회차. 과업·비교안 확정 전 임의로 A/B를 배정하지 않음 |
| `ut_slot` | 해당 회차의 `P01 / P02 / P03 / P04 / P05`, 코드가 없거나 잘못되면 `unassigned`. 영구 회원 ID가 아님 |
| `screen_id` | `map / list / detail / search / date / filters / filter_options / favorites / tickets / ticket_history / ai / facility_action / share / address / completion` |
| `component_id` | 카탈로그의 고정 식별자. 입력·상품명·주소를 식별자로 만들지 않음 |
| `data_mode` | 현재 앱은 `live`. 추후 합성 시나리오는 별도 값으로 명시 |

이벤트별 속성은 카탈로그의 `parameters` 목록에서 고른다. 예: `action`, `result`, `reason`, `service`, `origin`, `parking_id`, `product_type`, `display_mode`, `freshness`, `congestion`, `result_count`, `duration_bucket`, `date_bucket`, `enabled`, `input_present`, `field_id`, `share_step`, `dialog_type`, `progress`.

`parking_id`는 현재 카탈로그의 공개 시설 ID만 허용한다. 원천 상품 ID·주소 결과 인덱스·날짜 원문 대신 고정 상품 유형, `today / future`, 개수 구간 등을 사용한다. 주소 검색 결과 선택은 위치·주소가 아닌 `result=selected`만 보낸다. 입력 유무도 수집 안내에 포함하고 분석에 필요한 필드만 허용한다.

**수집 제외:** 자유 검색어, 주소·상세 주소, 위도·경도·지도 중심, 주차공간 이름·설명·수정 요청 본문, 차량번호·연락처·생년월일, 사진·문서·파일명·파일 경로, 클립보드 내용, 오류 메시지 원문·스택, API 응답, 키·토큰, 임의 URL 쿼리·해시, 참여자 이름·이메일. 예외를 블랙리스트로 거르는 대신 허용된 필드만 새 객체로 만든다.

참여자 테스트 코드는 사용자 승인에 따라 `?ut=P01`~`P05`에서만 읽고 모든 명시적 이벤트에 포함한다. 회차는 설정 파일의 `round_1`로 고정하고 원본 쿼리를 보내지 않는다. 코드가 중복되거나 허용 목록 밖이면 `unassigned`다. 브라우저에 새 참여자 저장소를 만들지 않으며, 코드 없는 링크에서는 과거 참여자를 이어받지 않는다. `?qa=technical_test` 또는 `?qa=rehearsal`은 참여자 코드보다 우선한다. 로컬·미리보기 호스트는 실제 UT로 분류하지 않는다. 진행자는 관찰 메모에도 같은 코드를 사용하고 이름·연락처 대응표를 GA4에 보내지 않는다. 이 코드는 본인 인증이 아니며 GA4의 브라우저 사용자 수를 합치는 기능도 아니다. 기존 내 공유 화면의 동의 체크는 분석 수집 동의로 재사용하지 않는다.

GA4 이벤트 범위 사용자 정의 측정기준은 우선 `ut_slot`, `study_round`, `traffic_type`, `screen_id`, `component_id`를 등록한다. 추가 후보는 `app_version`, `environment`, `result`, `reason`, `display_mode`, `freshness`, `share_step`, `dialog_type`다. 필요에 따라 등록하고 무작정 모두 추가하지 않는다. 고유 세션 ID·시각·검색어·URL·상품 ID를 사용자 정의 측정기준으로 등록하지 않는다. 매개변수 수신과 보고서에서의 사용 가능 여부는 별개로 점검한다.

## 5. 동작 결과 이벤트

다음 이름은 명시적 결과 훅에 연결했다. 일반 클릭 이벤트와 결과 이벤트는 목적이 다르므로 결과가 확인된 함수 분기에서 따로 기록한다. 실제 GA4 수신은 아직 확인 전이다.

| 이벤트 | 발생 조건·횟수 | 주요 추가 속성 |
| --- | --- | --- |
| `app_ready` | 카탈로그와 조작 핸들러 연결 완료, 초기화당 1회. 현황·지도 수신 완료와 구분 | `result` |
| `app_error` | 초기화 실패 분기, 1회 | `reason=catalog_load_failed / init_failed` |
| `map_load_result` | SDK·지도 생성 완료 또는 실패 분기 | `result`, `reason` |
| `map_interaction` | 사용자 드래그·배율 변경 종료. 코드의 focus/reset 이동과 구분 | `action=pan / zoom` |
| `search_result` | 목적지 검색 제출이 적용되었을 때 1회 | `result=matched / empty / cleared`, `result_count` |
| `filters_applied` | 초안이 실제 검색조건에 반영될 때 1회. 닫기·초기화 초안과 구분 | `result_count`, `service` |
| `date_applied` | 날짜·시간 검증 후 상태 반영 시 1회 | `date_bucket`, `duration_bucket` |
| `date_rejected` | 자정 경계 등 과거 날짜 재검사로 거절 | `reason=past_date` |
| `facility_opened` | 마커·목록·즐겨찾기에서 유효한 시설 상세를 열 때 | `parking_id`, `origin`, `display_mode`, `freshness`, `congestion` |
| `sheet_changed` | 클릭·드래그·터치·휠로 최종 상태가 실제 달라질 때 1회 | `action=expand / collapse / close`, `origin` |
| `parking_refresh_result` | 실제 네트워크 요청 완료마다 1회. 공유된 Promise의 호출자 수만큼 중복 기록하지 않음 | `origin=initial / manual / auto / resume`, `result`, `reason` |
| `favorite_result` | 즐겨찾기 저장 성공·실패 분기 | `parking_id`, `action=add / remove`, `result` |
| `clipboard_result` | 복사 Promise가 완료·실패했을 때 | `action=share / directions`, `result` |
| `edit_previewed` | 수정 내용 확인 처리 완료 | `result=preview_only` |
| `pass_request_previewed` | 이용권 요청 안내 표시 완료 | `result=preview_only` |
| `prototype_selection_saved` | `finishTest`에서 검증·localStorage 저장 성공 후 종료 화면 전환 시 1회 | `parking_id`, `product_type`, `display_mode`, `freshness` |
| `prototype_selection_failed` | 확인 상품 없음·판매 전·저장 실패 분기 | `reason=missing_product / sale_not_open / storage_failed` |
| `prototype_restarted` | 다시 테스트하기로 UI 초기화 완료 | `result` |
| `address_search_result` | 주소 조회 성공·빈 결과·실패 확정. 뒤늦은 취소 응답은 제외 | `result`, `result_count`, `reason` |
| `location_result` | 현재 위치 조회·역지오코딩 완료·오류. 취소는 실패와 구분 | `result`, `reason=denied / timeout / unsupported / invalid / lookup_failed / cancelled` |
| `address_confirmed` | 위치 확정 콜백 완료. 주소·좌표 없음 | `result=confirmed` |
| `share_preview_completed` | 내 공유 폼 검증 후 review 진입 | `result=preview_only`, `share_step=review` |
| `share_boundary_shown` | 거주자·월주차 외부 절차 경계 안내 노출 | `dialog_type`, `result=preview_only` |

`purchase`, `generate_lead`, 실제 `sign_up`을 보내지 않는다. 현재 앱에서는 실제 결제·예약·발급·공유 신청·수정 요청을 하지 않는다. `prototype_selection_saved`도 정보 이해 성공과 같지 않다. 이번에 모든 행동을 GA4 주요 이벤트로 지정하지 않으며 주요 이벤트 지정은 UT 과업을 확정한 후 결정한다.

## 6. 구현 구조와 연결 순서

1. 측정 ID 수령 → 공통 `analytics` 모듈·비활성 기본 설정·허용 속성 목록 추가. 설정이 없거나 태그 로드가 실패해도 앱은 정상 실행한다.
2. 동적 요소를 포함하는 이벤트 위임을 연결한다. 실제 SDK 마커는 캡처 단계에서 중단될 수 있으므로 문서 캡처 리스너 또는 마커 처리 함수에서 한 번만 기록한다.
3. 카탈로그의 결과 훅에 명시적으로 연결한다. `app_ready`를 실제 지도·현황 로드 성공으로 오해하지 않게 결과를 나눈다.
4. 활성 화면·대화상자·내 공유 단계 전환을 연결한다. 렌더마다 전송하지 않는다. 재생성된 동적 노드는 다시 관찰하되 기존 노출 키로 중복 방지한다.
5. 노출은 `screen_visit + component_id + parking_id + 표시 상태`별 1회로 제한한다. 30초 화면 갱신·60초 자동 조회·지도 마커 재생성을 새 사용자 조작으로 세지 않는다. 갱신으로 상태가 달라져 실제 다시 보인 경우는 새 노출로 구분한다.
6. 분석 전송은 화면 기능에서 기다리지 않는다. 태그를 읽는 동안 최대 100건을 메모리에서만 대기시키고 8초 초과·태그 오류 시 버린다. 실패한 행동 이벤트를 localStorage에 쌓거나 나중에 재전송하지 않는다. ID가 없으면 이벤트 위임·노출 관찰도 시작하지 않는다.
7. Chrome 로컬 확인 → 시험 배포 → 최종 Vercel 주소의 Network·DebugView·Realtime 확인 → UT용 링크와 회차 안내 전달.

## 7. UT 전 검증표

2026-10-26 준비 산출물 검사: JSON 구문·중복 식별자·원본 파일 경로·문서 링크·이벤트 이름 길이·`git diff --check` 통과. 조작 68그룹(선택자 89개), 화면 15그룹, 정보 노출 22그룹을 정리했다. 현재 진입점과 동적 UI 생성 파일 6개의 리터럴 조작 태그 116곳을 목록과 대조해 매핑 누락이 없음을 확인했다. 이는 소스 템플릿 대조이며 실제 생성된 모든 DOM·SDK·조건 분기의 수집 검증이 아니다.

후속 구현 검증: Node 테스트 68/68 통과. Chrome에서 대표 흐름과 P01→P02 변경·P02 새로고침·입력 제외·선택 완료 1회·실제 `purchase` 미발생을 확인했다. 별도 로컬 테스트 서버가 메모리 수신기와 가상 현황·가상 주차권을 주입한 자체 검증이다. 운영 코드에는 그 수신기·가상값을 넣지 않았다. 실제 앱에서도 ID 미설정 시 태그 없이 초기화되는 것을 확인했다.

아래 표는 실제 GA4 연결 후의 통과 기준이다. 최종 배포·GA4 수신·전체 예외 분기·실제 참여자 UT는 아직 `NOT_RUN`이며 로컬 대표 흐름 확인으로 대체하지 않는다.

| 확인 항목 | 통과 기준 |
| --- | --- |
| 시작·새로고침 | `page_view` 1회, 초기화 결과·지도·현황 결과 구분 |
| 전체 요소 | 카탈로그의 모든 조작 그룹을 Chrome에서 실제로 실행. 동적 생성·빈 상태·오류 뒤 재생성도 확인 |
| 포인터·키보드 | 버튼 안 글자·아이콘 클릭, Enter 폼 제출, summary 키보드 전환에서 각각 올바른 행동 1회 |
| 시트·지도 | 드래그 뒤 합성 클릭으로 중복 없음. 프로그램에 의한 지도 이동은 사용자 조작에서 제외 |
| 노출 | 가려진 화면·접힌 영역·배경 탭 제외. 실제 화면 표시 전에는 노출 없음 |
| 입력 보호 | 가짜 개인정보를 입력하고 Network payload에 검색어·주소·본문·파일명·좌표가 없는지 확인 |
| 중복·갱신 | 즐겨찾기 저장·복사 완료·구매 연속 클릭·자동 조회·탭 복귀에서 완료 횟수 정확 |
| 오류·차단 | 네트워크 실패·위치 거부·저장 실패·태그 차단 시 앱 사용 가능, 허용 사유 코드만 전송 |
| GA4 수신 | 측정 ID·배포 버전·기기·이벤트 속성을 Network와 DebugView에서 대조. Realtime 별도 확인 |
| 보고서 | 사용자 정의 측정기준 반영 후 기술 점검·리허설·실제 UT 분리 가능 |
| 대상 주소 | 실제 안내할 Vercel URL에서 같은 버전과 수신 확인. 로컬 통과로 대체하지 않음 |

GA4 DebugView는 `debug_mode:true`를 넣어 확인하고 종료할 때 매개변수 자체를 제거한다. `false` 설정만으로 비활성화했다고 간주하지 않는다. GA4 차단·네트워크·동의 선택 때문에 일부 행동은 기록되지 않을 수 있으므로 전 참여자 행동의 완전한 원장으로 사용하지 않는다.

## 8. UT 분석과 남은 결정

목록→상세→정보 노출→조건 확인→선택 저장 흐름을 탐색하되, 모든 단계가 모든 사용자에게 필수라고 가정하지 않는다. 뒤로가기·검색 반복·비교·구매 보류는 합리적 행동일 수 있다. 상태·갱신 시각 노출은 이해의 증거가 아니므로 기존 목적의 ‘상태 의미·기준 시점·입차 보장 여부’는 진행자 질문과 설명 관찰로 판정한다.

과업 시작·종료 기준·참여자 조건·회차·성공 기준은 아직 최종 확정하지 않았다. 따라서 GA4 방문자를 분모로 과업 성공률을 계산하거나 임의 시간 제한을 넣지 않는다. 실제 UT 링크를 보낸 뒤 기술 점검 이벤트를 실제 참여자 성과에 섞지 않는다.

다음 입력은 새 속성의 **측정 ID**다. 속성 생성이 끝나면 `analytics-config.js`에 ID를 입력하고 최종 Vercel 주소의 태그·이벤트 수신을 검증한다. 소스 구현·로컬 합격으로 GA4 속성 생성·배포·수신·UT 실행이 완료된 것은 아니다.
