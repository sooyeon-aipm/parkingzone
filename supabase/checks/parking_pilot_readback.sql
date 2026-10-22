-- 별도 실행으로 읽어 첫 저장이 실제 DB에 남았는지 확인한다.
select p.name, p.source_parking_id, o.total_spaces, o.available_spaces,
       o.source_updated_at at time zone 'Asia/Seoul' as source_updated_kst,
       o.collected_at at time zone 'Asia/Seoul' as collected_kst,
       a.result_status,
       (a.parking_id = o.parking_id) as same_parking_link,
       case when o.collected_at < now() - interval '7 days' then 'RETENTION_EXPIRED'
            when a.result_status <> 'SUCCESS' then 'LAST_RECORD'
            when o.source_updated_at is null then 'SOURCE_TIME_MISSING'
            when o.source_updated_at < now() - interval '20 minutes' then 'STALE'
            else 'FRESH' end as freshness_at_query
from public.parking_lots p
join public.parking_observations o on o.parking_id = p.id
join public.parking_collection_attempts a on a.id = o.collection_attempt_id
order by p.name;
