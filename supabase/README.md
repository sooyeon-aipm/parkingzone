# Supabase 실제 DB 구축 기록

## 현재 결과

- 사용자가 준비한 `parkingzone` 프로젝트 `ksuzhoeahgqbvrbchwpb`를 사용했다. 프로젝트 URL: https://ksuzhoeahgqbvrbchwpb.supabase.co.
- DB 기본 설계는 이미 합의 완료다. 이 폴더는 기존 22개 컬럼을 PostgreSQL로 구현한 파일과 검사 기록이다.
- Chrome SQL Editor에서 생성 전 `PostgreSQL 17.11 / UTC / public 테이블 0개`를 확인했다.
- 실제 테이블 3개를 생성했다: `parking_lots` 5개, `parking_observations` 8개, `parking_collection_attempts` 9개 컬럼. 각각 RLS 활성화를 조회로 확인했다.
- 사용자가 선택한 `SOURCE_UNAVAILABLE`을 수집 결과 CHECK에 추가했다. 나머지 합의한 상태·보관 기준은 바꾸지 않았다.
- [실DB 제약 검사](checks/parking_core_constraints.sql) 10개가 PASS였다. 검사 데이터는 내부 트랜잭션 되돌림으로 남기지 않았다.
- 새로 수집한 실제 응답 4곳을 첫 저장했다. 후속 별도 SQL 조회로 수치·원천 시각·우리 수집 시각·외래키 연결을 확인했다.
- 대시보드 SQL Editor로 실행했다. 파일이 `migrations/`에 있다는 이유로 Supabase CLI의 원격 migration history 등록까지 완료됐다고 표현하지 않는다. 추후 CLI 연동 시 기준 이력을 맞춰야 한다.

## 세 테이블을 함께 보는 방법

| 테이블 | 무엇을 저장하는가 | 실제 첫 저장 |
| --- | --- | --- |
| parking_lots | 어느 주차장인지: 이름·주소·원천 코드 | 강변, 성수2가1동, 서울숲아이티밸리, 갤러리아포레 더몰 상가 |
| parking_observations | 언제 몇 면이었는지: 면수·원천 시각·우리 수집 시각 | 실제 응답의 정상 수치 4개 |
| parking_collection_attempts | 가져오기를 시도한 결과와 시작·종료 시각 | 위 4곳의 SUCCESS 기록 |

`parking_observations.parking_id`로 시설을 찾고 `collection_attempt_id`로 수집 성공 기록을 찾는다.
후속으로 브라우저의 별도 실데이터 모드에 이 DB를 연결했다. 기존 15개 더미 연습 모드도 유지한다. [화면 연결 인수인계](SCREEN_CONNECTION_HANDOFF.md)를 따른다.

## 생성 파일과 검사

- [실행한 생성 SQL](migrations/202610220001_parking_core.sql): 하나의 트랜잭션으로 생성. 같은 이름의 기존 테이블이 있으면 중단하며 덮어쓰지 않는다. **이미 생성된 프로젝트에 다시 실행하지 않는다.**
- [테이블·컬럼·RLS 조회](checks/parking_core_readback.sql): 5·8·9개와 RLS true 확인.
- [제약 검사](checks/parking_core_constraints.sql): FK, 수치 범위, 시도 중복, 품질과 시각, 미래 시각, 주차장 삭제 제한, 종료 조건, SOURCE_UNAVAILABLE, 성공 원본 저장 제한, 부모 삭제 시 NULL 연결.
- [실제값 재조회](checks/parking_pilot_readback.sql): 저장 시점의 수치를 조회한다. 오래된 값은 조회 시 STALE이 될 수 있다.

수집 부모와 상태의 주차장 일치, 접근 실패만 1회 재시도, 중복 실행 잠금은 후속 서버 전용 RPC와 수집 함수에 구현했다. 새 RPC 실DB 검사 7개와 로컬 검사 10개가 통과했다. 앞선 기본 제약 검사 10개와 구분한다. [서버 수집 인수인계](COLLECTION_HANDOFF.md)를 따른다.

## 일회 저장의 재현

1. `python3 scripts/probe_seoul_parking.py --fetch --output /private/tmp/parking-supabase-pilot-source.json`
2. `python3 scripts/prepare_parking_pilot_sql.py --input /private/tmp/parking-supabase-pilot-source.json --output /private/tmp/parking-pilot-insert.sql`
3. 생성한 SQL을 검토하고 SQL Editor에서 한 번 실행한다. 이미 끝난 같은 파일을 재실행하면 시도/상태 기본키 중복으로 전체 중단한다. 새로운 수집은 새 보고서와 새 시도 ID를 만든다.
4. `parking_pilot_readback.sql`을 별도 실행하여 읽는다.

이 절차는 아직 키를 사용하는 자동 DB 저장 프로그램이 아니다. 실데이터 4개를 DB에 넣을 수 있음을 검증한 수동 인계 경로다. 정상·최신 조건에 맞지 않으면 SQL 준비 코드가 중단하므로 오류값을 정상값으로 넣지 않는다.

갤러리아포레 원천 코드 3204785는 사용자가 선택한 더몰 상가다. 같은 주소의 아파트 3147217과 합치지 않았다.
원천의 시간대 없는 시각은 현재 KST로 해석한 상태이며 원천 시간대 설명은 운영 전 확인 항목이다.

## 다음 단계와 경계

- 사용자가 Supabase 실행과 5분 수집을 선택했다. 무료 요금제 가능 여부와 예상 사용량은 [무료 범위 계산](FREE_PLAN_BUDGET.md)에 기록했다. `collect-seoul-parking` 함수 배포와 서버 일회 자동 저장을 완료했다. HTTP 200, 4곳 처리 중 새 정상 상태 3개와 SOURCE_UNAVAILABLE 1개를 기록했다. 별도 DB 조회로 저장을 확인했다. 사용자가 인증정보 보관·실제 삭제 활성화를 승인하여 5분 수집·매시간 정리 Cron을 켰다. 00:35 첫 예약 실행의 HTTP 200과 새 상태 3개 저장을 별도 DB 조회로 확인했다.
- 수집기가 Supabase DB를 쓴다는 것과 Supabase 서버에서 실행된다는 것은 다르다. PC 실행이면 PC가 꺼질 때 수집도 멈춘다.
- 반복 수집 함수·7일 만료 정리 RPC·활성화/중지 SQL은 준비했다. 자동 호출 인증정보를 Vault에 보관하고 실제 삭제 일정을 활성화했다. 사용자 A1·B1 승인을 받았다. 매시간 정리의 첫 정각 실행은 아직 관찰하지 않았다. 최근 7일만 반환하는 서버 전용 조회 RPC·Edge 조회 API·로컬 프록시와 실데이터 화면 연결을 완료했다. 실제 4곳의 목록·상세를 확인했다.
- RLS는 활성화했지만 익명/로그인 사용자 정책과 조회 API는 열지 않았다. 팀의 대시보드 권한은 기존 상태를 유지했다. API 비밀 키·DB 비밀번호는 저장하거나 화면 코드에 넣지 않았다.
- 본 결과는 AI의 실제 DB 실행·자체 검사다. 유미·종현의 실행·학습 완료, 수연 승인, 사용자 UT 완료는 별도다.
