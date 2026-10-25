-- Invoke only after the user's action-time approval of seven-day record deletion.
select public.parking_pass_purge_expired();
select jsonb_build_object(
 'sources',(select count(*) from public.parking_pass_sources),
 'current_snapshots',(select count(*) from public.parking_pass_snapshots),
 'products',(select sum(jsonb_array_length(products)) from public.parking_pass_snapshots),
 'expired_changes',(select count(*) from public.parking_pass_changes where collected_at<now()-interval '7 days'),
 'expired_finished_runs',(select count(*) from public.parking_pass_runs where status<>'RUNNING' and started_at<now()-interval '7 days'),
 'retention_job',(select jsonb_build_object('jobid',jobid,'schedule',schedule,'active',active) from cron.job where jobname='parking-passes-purge-7days')
) as retention_verification;
