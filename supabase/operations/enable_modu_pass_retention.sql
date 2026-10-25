-- 7-day record retention. Current facility mappings and current snapshot are not history logs.
-- This schedules permanent deletion of changes/runs older than 7 days.
begin;
select cron.schedule('parking-passes-purge-7days','0 * * * *',$job$
 select public.parking_pass_purge_expired();
 delete from cron.job_run_details where jobid in(select jobid from cron.job where jobname in('parking-passes-5min','parking-passes-purge-7days')) and coalesce(end_time,start_time)<now()-interval '7 days';
$job$);
commit;
select jobid,jobname,schedule,active from cron.job where jobname='parking-passes-purge-7days';
