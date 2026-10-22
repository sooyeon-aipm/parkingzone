-- 읽기 전용: 화면 응답의 범위와 실제 접근 제한을 점검한다.
with snapshot as (select public.parking_read_snapshot() as data),
lots as (select value as lot from snapshot, jsonb_array_elements(data->'lots'))
select 'LIVE snapshot' as check_name,
       (select data->>'data_origin'='LIVE' and jsonb_typeof(data->'lots')='array' from snapshot) as passed
union all select 'bounded facilities', (select count(*) between 1 and 15 from lots)
union all select 'no raw or error details', not exists (
  select 1 from lots where lot::text like '%raw_payload%' or lot::text like '%error_message%')
union all select 'only last 7 days', not exists (
  select 1 from lots where (lot->'observation'->>'collected_at')::timestamptz < now()-interval '7 days'
    or (lot->'latest_collection'->>'started_at')::timestamptz < now()-interval '7 days')
union all select 'anon RPC denied', not has_function_privilege('anon','public.parking_read_snapshot()','execute')
union all select 'authenticated RPC denied', not has_function_privilege('authenticated','public.parking_read_snapshot()','execute');
