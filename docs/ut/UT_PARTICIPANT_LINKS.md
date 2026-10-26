# 온라인 UT 참여자 링크

2026-10-26 · 사용자 승인: 로그인 없이 5명에게 각기 다른 테스트 코드 링크를 전달한다.

**아래 링크는 공개 배포되어 접속·이벤트 수집이 가능하다.** `0b5c798`에서 GA4 ID `G-9J66ERM0PK`를 연결했고, 공개 사이트 점검 이벤트의 Google 수집 응답·DebugView·실시간 수신을 확인했다. 참여자별 실제 UT는 아직 미진행이다. 설정과 검증 범위는 [GA4 설정 안내](GA4_SETUP.md)를 따른다.

| 대상 | 사용할 링크 |
| --- | --- |
| 참여자 P01 | https://parkingzone.vercel.app/?ut=P01 |
| 참여자 P02 | https://parkingzone.vercel.app/?ut=P02 |
| 참여자 P03 | https://parkingzone.vercel.app/?ut=P03 |
| 참여자 P04 | https://parkingzone.vercel.app/?ut=P04 |
| 참여자 P05 | https://parkingzone.vercel.app/?ut=P05 |
| 팀 기술 점검 | https://parkingzone.vercel.app/?qa=technical_test&debug=1 |
| 팀 리허설 | https://parkingzone.vercel.app/?qa=rehearsal |
| 일반 방문 | https://parkingzone.vercel.app/ |

회차는 `prototype/analytics-config.js`의 `studyRound: 'round_1'`이다. 다음 회차는 설정 값을 바꾸고 배포 버전도 변경한 후 진행한다. `ut_slot`은 해당 회차의 고정 5개 슬롯이며 영구 회원 ID나 GA4 `user_id`로 사용하지 않는다.

진행자는 인터뷰·관찰 메모에 같은 P코드를 사용한다. 이름·이메일·연락처를 링크에 넣거나 GA4에 보내지 않는다. 참가자에게는 본인에게 받은 링크를 사용하고 공유하지 않도록 안내한다. 화면·기능은 모두 동일하며 코드만 이벤트 속성에 붙는다.

새로고침은 같은 코드가 유지된다. 다른 브라우저·기기에서도 같은 링크를 열면 같은 코드가 붙지만, GA4의 브라우저 사용자 수까지 자동으로 합쳐지지는 않는다. 링크를 다른 사람이 사용하면 같은 코드로 기록되므로 본인 인증 수단으로 보지 않는다.

브라우저에 참여자 코드를 영구 저장하지 않는다. 같은 브라우저에서 P02 링크로 바꾸면 P02가 되고, 코드 없는 링크를 새로 열면 `unassigned`가 된다. `P06`, 소문자 코드, 중복 `ut` 값은 참여자 코드로 인정하지 않는다. QA 링크는 `ut`가 함께 있어도 참여자로 기록하지 않는다. 로컬·미리보기 주소는 기술 점검으로 구분한다.

GA4에는 이벤트 범위 측정기준 `ut_slot`, `study_round`, `traffic_type`, `screen_id`, `component_id` 5개가 등록되어 있다. `traffic_type=ut`, `study_round=round_1` 조건에서 P01~P05를 비교한다. 진행자 자신은 팀 기술 점검·리허설 링크를 사용한다. 이번 수신 점검은 이 링크로 진행했으며 실제 P01~P05 참여자 결과에 넣지 않는다. 일반 보고서의 새 측정기준 반영은 지연될 수 있다.

GA4 기록 누락·링크 오사용 가능성이 있으므로 참여 인원은 모집·인터뷰 기록으로 확인한다. 클릭·노출만으로 정보 이해도나 선택 이유를 판정하지 않는다.
