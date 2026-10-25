-- Run only after one real server collection and DB readback succeed.
begin;
do $$ begin
 if (select count(*) from vault.secrets where name in ('parking_collector_api_key','parking_collector_gateway_jwt'))<>2 then raise exception 'VAULT_CONFIG_MISSING';end if;
 if not exists(select 1 from public.parking_pass_runs where status='SUCCESS') then raise exception 'SUCCESSFUL_PILOT_REQUIRED';end if;
 if exists(select 1 from cron.job where jobname='parking-passes-5min') then raise exception 'JOB_ALREADY_EXISTS';end if;
end $$;
select cron.schedule('parking-passes-5min','*/5 * * * *',$job$
 select net.http_post(
 url:='https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/collect-modu-passes',
 headers:=jsonb_build_object('Content-Type','application/json',
 'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='parking_collector_gateway_jwt'),
 'apikey',(select decrypted_secret from vault.decrypted_secrets where name='parking_collector_api_key')),
 body:='{}'::jsonb,timeout_milliseconds:=150000);
$job$);
commit;
select jobid,jobname,schedule,active from cron.job where jobname='parking-passes-5min';
