-- 주차 데이터의 첫 실제 스키마: 기본정보 5 / 상태 8 / 수집 시도 9개 컬럼.
-- 기존 테이블을 삭제하거나 덮어쓰지 않는다. 같은 이름이 있으면 전체 중단한다.
-- 아직 수집 실행·일정·사용자 화면 읽기 정책을 만들지 않는다.
begin;

create table public.parking_lots (
    id uuid primary key default gen_random_uuid(),
    name text not null check (btrim(name) <> ''),
    address text not null check (btrim(address) <> ''),
    source text not null check (btrim(source) <> ''),
    source_parking_id text check (source_parking_id is null or btrim(source_parking_id) <> ''),
    constraint parking_lots_source_identity_key unique (source, source_parking_id)
);

create table public.parking_collection_attempts (
    id uuid primary key default gen_random_uuid(),
    parking_id uuid references public.parking_lots(id) on delete restrict,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    result_status text not null default 'IN_PROGRESS'
        check (result_status in ('IN_PROGRESS', 'SUCCESS', 'FETCH_ERROR',
                                 'VALIDATION_ERROR', 'SOURCE_UNAVAILABLE')),
    error_code text,
    error_message text,
    raw_payload jsonb,
    retry_of_id uuid references public.parking_collection_attempts(id) on delete set null,
    constraint collection_finish_order_check
        check (finished_at is null or finished_at >= started_at),
    constraint collection_finish_status_check
        check ((result_status = 'IN_PROGRESS' and finished_at is null)
            or (result_status <> 'IN_PROGRESS' and finished_at is not null)),
    constraint collection_success_target_check
        check (result_status <> 'SUCCESS' or parking_id is not null),
    constraint collection_error_detail_check
        check (result_status in ('IN_PROGRESS', 'SUCCESS')
            or (nullif(btrim(error_code), '') is not null
                and nullif(btrim(error_message), '') is not null)),
    constraint collection_raw_error_only_check
        check (raw_payload is null
            or result_status in ('FETCH_ERROR', 'VALIDATION_ERROR', 'SOURCE_UNAVAILABLE')),
    constraint collection_retry_not_self_check check (retry_of_id is null or retry_of_id <> id)
);

create table public.parking_observations (
    id uuid primary key default gen_random_uuid(),
    parking_id uuid not null references public.parking_lots(id) on delete restrict,
    total_spaces integer not null check (total_spaces >= 1),
    available_spaces integer not null check (available_spaces >= 0 and available_spaces <= total_spaces),
    source_updated_at timestamptz,
    collected_at timestamptz not null default now(),
    quality_status text not null check (quality_status in ('VALID', 'SOURCE_TIME_MISSING')),
    collection_attempt_id uuid unique
        references public.parking_collection_attempts(id) on delete set null,
    constraint observation_quality_time_check
        check ((quality_status = 'VALID' and source_updated_at is not null)
            or (quality_status = 'SOURCE_TIME_MISSING' and source_updated_at is null)),
    constraint observation_time_order_check
        check (source_updated_at is null or source_updated_at <= collected_at)
);

create index parking_observations_latest_idx
    on public.parking_observations (parking_id, collected_at desc);
create index parking_observations_retention_idx
    on public.parking_observations (collected_at);
create index parking_attempts_latest_idx
    on public.parking_collection_attempts (parking_id, started_at desc);
create index parking_attempts_retention_idx
    on public.parking_collection_attempts (started_at);
create index parking_attempts_retry_idx
    on public.parking_collection_attempts (retry_of_id);

-- 공개 API의 읽기·쓰기는 아직 허용하지 않는다. 팀의 기존 대시보드 권한은 바꾸지 않는다.
alter table public.parking_lots enable row level security;
alter table public.parking_collection_attempts enable row level security;
alter table public.parking_observations enable row level security;

comment on table public.parking_lots is '시설 기본정보. 원천 코드는 같은 시설인지 확인한 뒤 등록한다.';
comment on table public.parking_collection_attempts is '시설별 수집 시도. SOURCE_UNAVAILABLE은 원천 미연계·수집 중·통신 점검 등이다.';
comment on table public.parking_observations is '검증된 면수 이력. collected_at 기준 7일 보관 정책을 적용할 대상이다.';
comment on column public.parking_observations.source_updated_at is '제공처의 주차 현황 시각. 없으면 NULL, 수집 시각으로 대체하지 않는다.';
comment on column public.parking_observations.collected_at is '우리 수집 시각. UTC 저장, 한국 시간 표시.';

commit;
