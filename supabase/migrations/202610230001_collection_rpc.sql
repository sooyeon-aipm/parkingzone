-- 확정된 세 테이블을 그대로 사용한다. 새 업무 컬럼·테이블은 만들지 않는다.
-- RPC는 기존 서버 역할만 호출할 수 있다. 익명·일반 로그인 사용자에게 열지 않는다.
begin;

create function public.parking_begin_collection(p_retry_ids uuid[] default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  tasks jsonb;
begin
  perform pg_advisory_xact_lock(74123, 1);
  if exists (select 1 from public.parking_collection_attempts a
             join public.parking_lots p on p.id = a.parking_id
             where p.source = 'seoul_parking_web' and a.result_status = 'IN_PROGRESS'
               and a.started_at > clock_timestamp() - interval '3 minutes') then
    return jsonb_build_object('busy', true, 'tasks', '[]'::jsonb);
  end if;

  update public.parking_collection_attempts a
     set result_status = 'FETCH_ERROR', finished_at = clock_timestamp(),
         error_code = 'WORKER_INTERRUPTED', error_message = '3분 안에 완료되지 않은 이전 수집'
    from public.parking_lots p
   where p.id = a.parking_id and p.source = 'seoul_parking_web'
     and a.result_status = 'IN_PROGRESS';

  if p_retry_ids is null then
    with created as (
      insert into public.parking_collection_attempts (parking_id, started_at)
      select p.id, clock_timestamp() from public.parking_lots p
       where p.source = 'seoul_parking_web' and p.source_parking_id is not null
         and p.address ~ '성수동[12]가[[:space:]]+[0-9]'
      returning id, parking_id, started_at
    ) select coalesce(jsonb_agg(jsonb_build_object(
         'id', c.id, 'parking_id', p.id, 'started_at', c.started_at,
         'source_parking_id', p.source_parking_id, 'address', p.address)), '[]'::jsonb)
      into tasks from created c join public.parking_lots p on p.id = c.parking_id;
  else
    if cardinality(p_retry_ids) > 15 then raise exception '재시도 대상 수 초과'; end if;
    with created as (
      insert into public.parking_collection_attempts (parking_id, started_at, retry_of_id)
      select a.parking_id, clock_timestamp(), a.id
        from public.parking_collection_attempts a
        join public.parking_lots p on p.id = a.parking_id
       where a.id = any(p_retry_ids) and p.source = 'seoul_parking_web'
         and a.result_status = 'FETCH_ERROR' and a.retry_of_id is null
         and a.error_code in ('SOURCE_TIMEOUT', 'SOURCE_NETWORK', 'SOURCE_HTTP')
         and a.finished_at <= clock_timestamp() - interval '30 seconds'
         and not exists (select 1 from public.parking_collection_attempts r where r.retry_of_id = a.id)
      returning id, parking_id, started_at
    ) select coalesce(jsonb_agg(jsonb_build_object(
         'id', c.id, 'parking_id', p.id, 'started_at', c.started_at,
         'source_parking_id', p.source_parking_id, 'address', p.address)), '[]'::jsonb)
      into tasks from created c join public.parking_lots p on p.id = c.parking_id;
  end if;
  return jsonb_build_object('busy', false, 'tasks', tasks);
end;
$$;

create function public.parking_finish_collection(p_results jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb;
  a public.parking_collection_attempts%rowtype;
  n integer := 0;
  count_records integer := 0;
  collected timestamptz;
  source_time timestamptz;
begin
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) > 15 then
    raise exception '수집 결과 배열 형식 오류';
  end if;
  for r in select value from jsonb_array_elements(p_results) loop
    select * into strict a from public.parking_collection_attempts
     where id = (r->>'id')::uuid for update;
    if a.parking_id is distinct from (r->>'parking_id')::uuid then
      raise exception '수집 결과 주차장 불일치';
    end if;
    -- 응답 유실 후 같은 완료 요청을 재전송하면 새 이력을 만들지 않는다.
    if a.result_status <> 'IN_PROGRESS' then continue; end if;
    if r->>'result_status' not in ('SUCCESS','FETCH_ERROR','VALIDATION_ERROR','SOURCE_UNAVAILABLE') then
      raise exception '알 수 없는 수집 결과';
    end if;
    if r->>'result_status' = 'SUCCESS' then
      if r->>'quality_status' is null or r->>'total_spaces' is null or r->>'available_spaces' is null then
        raise exception '정상 결과 필수값 누락';
      end if;
      collected := (r->>'collected_at')::timestamptz;
      source_time := (r->>'source_updated_at')::timestamptz;
      if collected is null or collected < a.started_at or collected > clock_timestamp() + interval '1 second' then
        raise exception '수집 시각 순서 오류';
      end if;
      insert into public.parking_observations
        (parking_id, total_spaces, available_spaces, source_updated_at,
         collected_at, quality_status, collection_attempt_id)
      values (a.parking_id, (r->>'total_spaces')::integer, (r->>'available_spaces')::integer,
              source_time, collected, r->>'quality_status', a.id);
      count_records := count_records + 1;
    end if;
    if octet_length(coalesce((r->'raw_payload')::text, '')) > 4096 then
      raise exception '오류 원본 최소 크기 제한 초과';
    end if;
    update public.parking_collection_attempts
       set result_status = r->>'result_status', finished_at = clock_timestamp(),
           error_code = r->>'error_code', error_message = left(r->>'error_message', 500),
           raw_payload = case when r->>'result_status' = 'SUCCESS' then null
                              else nullif(r->'raw_payload', 'null'::jsonb) end
     where id = a.id;
    n := n + 1;
  end loop;
  return jsonb_build_object('finished', n, 'observations_added', count_records);
end;
$$;

create function public.parking_purge_expired_records()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  observations_removed integer;
  attempts_removed integer;
begin
  delete from public.parking_observations where collected_at < now() - interval '7 days';
  get diagnostics observations_removed = row_count;
  delete from public.parking_collection_attempts where started_at < now() - interval '7 days';
  get diagnostics attempts_removed = row_count;
  return jsonb_build_object('observations_removed', observations_removed, 'attempts_removed', attempts_removed);
end;
$$;

revoke all on function public.parking_begin_collection(uuid[]) from public, anon, authenticated;
revoke all on function public.parking_finish_collection(jsonb) from public, anon, authenticated;
revoke all on function public.parking_purge_expired_records() from public, anon, authenticated;
grant execute on function public.parking_begin_collection(uuid[]) to service_role;
grant execute on function public.parking_finish_collection(jsonb) to service_role;
grant execute on function public.parking_purge_expired_records() to service_role;

commit;
