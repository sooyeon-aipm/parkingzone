select cron.alter_job(jobid,active:=false) from cron.job where jobname in('parking-passes-5min','parking-passes-purge-7days');
select jobid,jobname,schedule,active from cron.job where jobname in('parking-passes-5min','parking-passes-purge-7days');
