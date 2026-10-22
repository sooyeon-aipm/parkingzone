-- 인증값·요청 헤더·원본 오류는 출력하지 않는다.
select now() at time zone 'Asia/Seoul' as checked_at_kst,
       j.jobid, j.jobname, j.schedule, j.active,
       r.status as last_run_status,
       r.start_time at time zone 'Asia/Seoul' as last_started_kst,
       r.end_time at time zone 'Asia/Seoul' as last_ended_kst
from cron.job j
left join lateral (
  select status, start_time, end_time from cron.job_run_details
   where jobid=j.jobid order by runid desc limit 1
) r on true
where j.jobname in ('parking-collect-5min','parking-purge-7days-hourly')
order by j.jobid;

-- pg_net 응답의 집계만 확인한다. 200이어도 DB 저장 조회를 함께 확인한다.
select id, status_code, timed_out, error_msg,
       created at time zone 'Asia/Seoul' as response_created_kst,
       case when status_code=200 then content::jsonb else null end as result_summary
from net._http_response
order by id desc limit 3;

select p.name, a.result_status, a.error_code,
       a.started_at at time zone 'Asia/Seoul' as started_kst,
       a.finished_at at time zone 'Asia/Seoul' as finished_kst,
       count(o.id) as saved_observations
from public.parking_lots p
join lateral (
  select * from public.parking_collection_attempts a
   where a.parking_id=p.id order by started_at desc, id desc limit 1
) a on true
left join public.parking_observations o on o.collection_attempt_id=a.id
where p.source='seoul_parking_web'
group by p.name, a.result_status, a.error_code, a.started_at, a.finished_at
order by p.name;
