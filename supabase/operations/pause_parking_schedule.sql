-- 삭제 없이 이 프로젝트의 두 예약 작업만 일시 중지한다.
select cron.alter_job(jobid, active := false)
from cron.job
where jobname in ('parking-collect-5min','parking-purge-7days-hourly');

select jobid, jobname, schedule, active from cron.job
where jobname in ('parking-collect-5min','parking-purge-7days-hourly');
