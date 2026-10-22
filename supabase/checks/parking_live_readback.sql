-- 원본 오류·인증정보를 제외한 현재 저장 상태 조회. 원천 시각과 수집 시각을 구분한다.
select p.name, p.source_parking_id,
       a.result_status as latest_result, a.error_code,
       a.started_at at time zone 'Asia/Seoul' as attempt_started_kst,
       o.total_spaces, o.available_spaces,
       o.source_updated_at at time zone 'Asia/Seoul' as source_updated_kst,
       o.collected_at at time zone 'Asia/Seoul' as collected_kst,
       case when o.id is null then 'NO_DATA'
            when a.result_status <> 'SUCCESS' then 'LAST_RECORD'
            when o.source_updated_at is null then 'SOURCE_TIME_MISSING'
            when o.source_updated_at < now()-interval '20 minutes' then 'STALE'
            else 'CURRENT' end as display_mode,
       (select count(*) from public.parking_collection_attempts x
         where x.parking_id=p.id and x.started_at >= now()-interval '7 days') as attempts_7d,
       (select count(*) from public.parking_observations x
         where x.parking_id=p.id and x.collected_at >= now()-interval '7 days') as observations_7d
from public.parking_lots p
left join lateral (
  select * from public.parking_collection_attempts a
   where a.parking_id=p.id and a.started_at >= now()-interval '7 days'
   order by a.started_at desc, a.id desc limit 1
) a on true
left join lateral (
  select * from public.parking_observations o
   where o.parking_id=p.id and o.collected_at >= now()-interval '7 days'
   order by o.collected_at desc, o.id desc limit 1
) o on true
where p.source='seoul_parking_web'
order by p.name;
