-- 실행 전 확인 대상: 기존 호출 인증정보의 Vault 보관, 7일 초과 기록의 실제 삭제.
-- 승인 뒤 같은 프로젝트 Vault에 아래 두 항목을 저장해야 한다.
-- parking_collector_api_key: 기존 default secret 키
-- parking_collector_gateway_jwt: 기존 legacy anon JWT (게이트웨이 검증용, 서버 키 아님)
-- 비밀값을 이 파일·쿼리 이력·브라우저 화면 코드에 넣지 않는다.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $ready$
begin
  if (select count(*) from vault.secrets
       where name in ('parking_collector_api_key','parking_collector_gateway_jwt')) <> 2 then
    raise exception '호출 인증정보의 Vault 설정이 필요함';
  end if;
  if exists (select 1 from cron.job where jobname in ('parking-collect-5min','parking-purge-7days-hourly')) then
    raise exception '같은 예약 작업이 이미 있음: 기존 설정과 대조 후 진행';
  end if;
end
$ready$;

select cron.schedule('parking-collect-5min', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/collect-seoul-parking',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                    where name='parking_collector_gateway_jwt'),
      'apikey',(select decrypted_secret from vault.decrypted_secrets
                 where name='parking_collector_api_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
$job$);

select cron.schedule('parking-purge-7days-hourly', '0 * * * *', $job$
  select public.parking_purge_expired_records();
  delete from cron.job_run_details
   where jobid in (select jobid from cron.job
                    where jobname in ('parking-collect-5min','parking-purge-7days-hourly'))
     and coalesce(end_time,start_time) < now()-interval '7 days';
$job$);
commit;

select jobid, jobname, schedule, active from cron.job
 where jobname in ('parking-collect-5min','parking-purge-7days-hourly');
