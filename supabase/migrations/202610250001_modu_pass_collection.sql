-- Additive: existing parking status tables/RPC are unchanged.
begin;
create table public.parking_pass_sources (
 parking_id uuid primary key references public.parking_lots(id) on delete restrict,
 provider_id bigint unique not null check(provider_id>0),
 expected_name text not null, expected_address text not null,
 enabled boolean not null default true
);
create table public.parking_pass_runs (
 id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null default 'RUNNING' check(status in ('RUNNING','SUCCESS','PARTIAL','ERROR')),
 query_date date not null, results jsonb, check(results is null or jsonb_typeof(results)='array')
);
create table public.parking_pass_snapshots (
 parking_id uuid primary key references public.parking_pass_sources(parking_id),
 query_date date, products jsonb not null default '[]' check(jsonb_typeof(products)='array' and jsonb_array_length(products)<=100),
 collected_at timestamptz, last_attempt_at timestamptz not null,
 last_result text not null check(last_result in ('SUCCESS','ERROR')),
 last_error text, source_url text,
 check((query_date is null)=(collected_at is null))
);
create table public.parking_pass_changes (
 id bigint generated always as identity primary key,
 parking_id uuid not null references public.parking_pass_sources(parking_id),
 query_date date not null, products jsonb not null,
 collected_at timestamptz not null
);
create index parking_pass_changes_retention on public.parking_pass_changes(collected_at);
create index parking_pass_runs_retention on public.parking_pass_runs(started_at);
alter table public.parking_pass_sources enable row level security;
alter table public.parking_pass_runs enable row level security;
alter table public.parking_pass_snapshots enable row level security;
alter table public.parking_pass_changes enable row level security;
revoke all on public.parking_pass_sources,public.parking_pass_runs,public.parking_pass_snapshots,public.parking_pass_changes from anon,authenticated;
grant all on public.parking_pass_sources,public.parking_pass_runs,public.parking_pass_snapshots,public.parking_pass_changes to service_role;
grant usage,select on sequence public.parking_pass_changes_id_seq to service_role;

create function public.parking_pass_begin() returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_date date := (now() at time zone 'Asia/Seoul')::date;
begin
 perform pg_catalog.pg_advisory_xact_lock(20261025,1);
 if exists(select 1 from public.parking_pass_runs where status='RUNNING' and started_at>now()-interval '3 minutes') then
  return jsonb_build_object('busy',true);
 end if;
 update public.parking_pass_runs set status='ERROR',finished_at=now(),results='[{"error_code":"WORKER_INTERRUPTED"}]' where status='RUNNING';
 insert into public.parking_pass_runs(query_date) values(v_date) returning id into v_id;
 return jsonb_build_object('run_id',v_id,'query_date',v_date,'sources',coalesce((select jsonb_agg(jsonb_build_object('parking_id',parking_id,'provider_id',provider_id,'expected_name',expected_name,'expected_address',expected_address) order by provider_id) from public.parking_pass_sources where enabled),'[]'::jsonb));
end $$;

create function public.parking_pass_finish(p_run_id uuid,p_query_date date,p_results jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; good integer:=0; bad integer:=0; previous public.parking_pass_snapshots; v_parking uuid; v_collected timestamptz; v_summary jsonb:='[]';
begin
 perform pg_catalog.pg_advisory_xact_lock(20261025,1);
 if not exists(select 1 from public.parking_pass_runs where id=p_run_id and status='RUNNING' and query_date=p_query_date) then raise exception 'INVALID_OR_FINISHED_RUN'; end if;
 if p_query_date<>(now() at time zone 'Asia/Seoul')::date then raise exception 'DAY_ROLLOVER';end if;
 if p_results is null or jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>(select count(*) from public.parking_pass_sources where enabled) then raise exception 'INVALID_RESULT_COUNT';end if;
 if (select count(distinct x->>'parking_id') from jsonb_array_elements(p_results) x)<>jsonb_array_length(p_results) then raise exception 'DUPLICATE_TARGET';end if;
 for r in select * from jsonb_array_elements(p_results) loop
  v_parking:=(r->>'parking_id')::uuid;
  if not exists(select 1 from public.parking_pass_sources where parking_id=v_parking and enabled) then raise exception 'UNKNOWN_TARGET';end if;
  if r->>'status'='SUCCESS' then
   if jsonb_typeof(r->'products')<>'array' or jsonb_array_length(r->'products')>100 then raise exception 'INVALID_PRODUCTS';end if;
   v_collected:=(r->>'collected_at')::timestamptz;
   if v_collected>now()+interval '30 seconds' or v_collected<now()-interval '3 minutes' then raise exception 'INVALID_COLLECTION_TIME';end if;
   select * into previous from public.parking_pass_snapshots where parking_id=v_parking;
   if previous.collected_at is null or previous.query_date is distinct from p_query_date or previous.products is distinct from r->'products' then
    insert into public.parking_pass_changes(parking_id,query_date,products,collected_at) values(v_parking,p_query_date,r->'products',v_collected);
   end if;
   insert into public.parking_pass_snapshots(parking_id,query_date,products,collected_at,last_attempt_at,last_result,last_error,source_url)
   values(v_parking,p_query_date,r->'products',v_collected,now(),'SUCCESS',null,r->>'source_url')
   on conflict(parking_id) do update set query_date=excluded.query_date,products=excluded.products,collected_at=excluded.collected_at,last_attempt_at=excluded.last_attempt_at,last_result='SUCCESS',last_error=null,source_url=excluded.source_url;
   good:=good+1;
  elsif r->>'status'='ERROR' then
   insert into public.parking_pass_snapshots(parking_id,last_attempt_at,last_result,last_error)
   values(v_parking,now(),'ERROR',left(coalesce(r->>'error_code','UNKNOWN'),80))
   on conflict(parking_id) do update set last_attempt_at=now(),last_result='ERROR',last_error=excluded.last_error;
   bad:=bad+1;
  else raise exception 'INVALID_STATUS';end if;
  v_summary:=v_summary||jsonb_build_array(jsonb_build_object('parking_id',v_parking,'status',r->>'status','products',case when r->>'status'='SUCCESS' then jsonb_array_length(r->'products') else null end,'error_code',r->>'error_code'));
 end loop;
 update public.parking_pass_runs set finished_at=now(),status=case when bad=0 then 'SUCCESS' when good=0 then 'ERROR' else 'PARTIAL' end,results=v_summary where id=p_run_id;
 return jsonb_build_object('run_id',p_run_id,'success',good,'failed',bad,'completed_at',now());
end $$;

create function public.parking_read_snapshot_with_passes() returns jsonb language sql stable security invoker set search_path='' as $$
 select public.parking_read_snapshot()||jsonb_build_object('pass_snapshots',coalesce((select jsonb_agg(jsonb_build_object('parking_id',s.parking_id,'query_date',s.query_date,'products',case when s.collected_at>=now()-interval '7 days' then s.products else '[]'::jsonb end,'collected_at',s.collected_at,'last_attempt_at',s.last_attempt_at,'last_result',s.last_result,'last_error',s.last_error,'source_url',s.source_url)) from public.parking_pass_snapshots s),'[]'::jsonb));
$$;

create function public.parking_pass_purge_expired() returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from public.parking_pass_changes where collected_at<now()-interval '7 days';
 delete from public.parking_pass_runs where status<>'RUNNING' and started_at<now()-interval '7 days';
end $$;
revoke all on function public.parking_pass_begin(), public.parking_pass_finish(uuid,date,jsonb),public.parking_read_snapshot_with_passes(),public.parking_pass_purge_expired() from public,anon,authenticated;
grant execute on function public.parking_pass_begin(), public.parking_pass_finish(uuid,date,jsonb),public.parking_read_snapshot_with_passes(),public.parking_pass_purge_expired() to service_role;
commit;
