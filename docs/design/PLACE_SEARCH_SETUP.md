# 가게 목적지 검색 연결

2026-10-30 · 사용자 요청: 네이버 지역 검색으로 가게를 선택하고 가까운 등록 주차장을 표시한다.

## 구현 범위

- 검색창 입력 중에는 등록 주차장만 검색한다. 검색 버튼을 누르면 `POST /api/places`로 네이버 장소 후보를 조회한다.
- 성수·뚝섬·서울숲·서울 등 지역 표현이 없는 검색어에는 `성수`를 앞에 붙인다. 네이버 결과 최대 5개를 별도 영역에서 제공 순서대로 표시한다. 이름·주소·분류를 확인한 뒤 사용자가 선택한다.
- 선택한 가게를 지도에 표시하고 직선거리 1km 안의 등록 주차장만 거리순으로 표시한다. 반경은 `prototype/place-search.js`의 `NEARBY_METERS`다. 도보·운전 경로 거리가 아니다.
- 주차권이 없는 주변 시설도 정보 상세로 열 수 있다. 기존 상품의 날짜·이용 가능 상태는 그대로 적용한다. 네이버에서 주차 현황·요금·새 주차장 데이터를 생성하거나 가져오지는 않는다.
- 입력 변경·검색 닫기·다른 검색·초기화 시 이전 요청을 취소한다. 응답이 늦어도 새 결과를 덮어쓰지 않는다.
- 키 미설정, API 실패, 호출 제한, 검색 결과 없음은 서로 다른 안내를 사용한다. 기존 등록 주차장 검색은 유지한다.

## 인증키 연결

1. 네이버 클라우드 콘솔 → Application Services → NAVER API HUB → 서비스 이용 신청. 이용약관과 개인정보 제3자 제공에 대한 사용자 동의가 필요하다.
2. Application 등록 → NAVER 검색의 **지역**만 선택 → 이름 `parkingzone-search` → 완료. 기존 지도용 키와 별개다.
3. 일·월 이용 한도를 설정한다. UT 초기 권장 상한은 일 1,000회·월 10,000회다. 공식 가이드는 한시 무료라고 안내하며 상시 무료를 보장하지 않는다.
4. 인증 정보의 Client ID / Client Secret을 기존 Supabase **parkingzone** 프로젝트의 Edge Function Secrets `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`에 설정한다. Vercel에는 새 환경 변수가 필요하지 않다. `api/places.js`가 기존 공개 anon 키로 `search-places` 함수를 호출한다. 네이버 비밀키는 Supabase 서버에서만 사용한다.
5. 공개 QA 주소에서 실제 가게 검색 → 주소 확인 → 목적지 선택 → 반경 1km 주차장·직선거리순·빈 결과를 확인한다. 실제 참여자 코드로 기술 점검 이벤트를 만들지 않는다.

로컬에서 공개 배포와 같은 API를 사용하려면 `node scripts/serve-prototype.cjs`를 실행한다. 기존 Python 서버는 장소 API를 제공하지 않으므로 장소 검색 검증에는 Node 서버를 사용한다.

## 데이터 처리와 검증 경계

- 실제 검색어는 검색 버튼을 누른 경우에만 Vercel과 기존 Supabase 서버를 거쳐 네이버에 전달한다. 브라우저 URL에 검색어를 넣지 않으며 앱에서 검색어·후보·선택 목적지를 DB/로컬 저장소/로그에 저장하지 않는다.
- GA4에는 기존 `search_result`·선택 클릭과 결과 개수·상태만 전달한다. 가게명·검색어·주소·좌표는 보내지 않는다. P01~P06 구분을 유지한다.
- API 키·네이버 원본 오류는 클라이언트에 반환하지 않는다. 고정 HTTPS API만 호출하며 JSON POST 입력 제한·동일 Origin 검사·8초 제한을 둔다.
- Supabase 서버 인스턴스 내 IP당 분당 30회 제한을 둔다. 여러 서버 인스턴스에 걸친 전역 제한은 아니므로 네이버 콘솔의 일·월 한도를 함께 설정한다. API 후보를 장기 저장하거나 캐시하지 않는다.
- 자체 검증 78/78 통과. Chrome에서 별도 로컬 가상 장소 응답으로 목적지 핀, 1km 내 9개 주차장, 115m부터 거리순 표시를 확인했다. 주차장 좌표·현황은 기존 실제 조회 경로를 사용했다. 이는 실제 네이버 가게 조회나 실제 참여자 UT 검증이 아니다.
- 2026-10-30 준비 시점: 지역 검색 전용 `parkingzone-search` Application 생성 및 일 1,000회·월 10,000회 한도 적용을 확인했다. Vercel은 팀원 소유로 현재 계정에서 설정에 접근할 수 없어, 기존 Supabase 서버의 Secrets와 새 `search-places` 함수로 연결하는 구성을 준비했다. 사용자가 Supabase 보관·연결을 명시적으로 승인했다. 인증키 2개를 Supabase Secrets에 저장하고 `search-places`를 배포했다. 게이트웨이 JWT 검증은 활성 상태를 유지했다. 로컬→실제 Supabase→네이버 조회에서 HTTP 200과 어니언 성수의 이름·주소·좌표를 확인했다. 실제 Chrome 흐름에서도 반경 1km 안의 7곳이 327m부터 거리순으로 표시됐다. 강남의 검색 후보 선택 시 주변 등록 주차장 없음, 빈 검색 시 목적지 핀 제거·기존 탐색 복구를 확인했다. 공개 Vercel 배포 검증은 이어서 진행한다.

공식 문서: [지역 검색 API](https://api.ncloud-docs.com/docs/naver-api-hub-search-local), [요청 헤더·인증](https://api.ncloud-docs.com/docs/naver-api-hub-overview), [신청·이용 한도](https://guide.ncloud-docs.com/docs/apihub-application), [한시 무료 안내](https://guide.ncloud-docs.com/docs/apihub-overview).
