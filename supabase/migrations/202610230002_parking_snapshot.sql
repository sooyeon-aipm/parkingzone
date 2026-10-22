-- 화면에 필요한 공개 주차 정보만 한 시점으로 읽는다. 기존 22개 컬럼·RLS는 유지한다.
begin;
create function public.parking_read_snapshot()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'data_origin', 'LIVE', 'as_of', now(),
    'lots', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'address', p.address,
      'observation', case when o.id is null then null else jsonb_build_object(
        'parking_id', p.id, 'total_spaces', o.total_spaces,
        'available_spaces', o.available_spaces, 'source_updated_at', o.source_updated_at,
        'collected_at', o.collected_at, 'quality_status', o.quality_status) end,
      'latest_collection', case when a.id is null then null else jsonb_build_object(
        'result_status', a.result_status, 'started_at', a.started_at,
        'finished_at', a.finished_at) end
    ) order by p.name), '[]'::jsonb)
  )
  from (
    select id, name, address from public.parking_lots
     where source='seoul_parking_web' and source_parking_id is not null
       and address ~ '성수동[12]가[[:space:]]+[0-9]'
     order by name, id limit 15
  ) p
  left join lateral (
    select id, result_status, started_at, finished_at
      from public.parking_collection_attempts a
     where a.parking_id=p.id and a.started_at >= now()-interval '7 days'
       and a.started_at <= now()
     order by a.started_at desc, a.id desc limit 1
  ) a on true
  left join lateral (
    select id, total_spaces, available_spaces, source_updated_at, collected_at, quality_status
      from public.parking_observations o
     where o.parking_id=p.id and o.collected_at >= now()-interval '7 days'
       and o.collected_at <= now()
     order by o.collected_at desc, o.id desc limit 1
  ) o on true;
$$;
revoke all on function public.parking_read_snapshot() from public, anon, authenticated;
grant execute on function public.parking_read_snapshot() to service_role;
commit;
