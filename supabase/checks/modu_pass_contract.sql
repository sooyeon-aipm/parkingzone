-- Local transaction only: failure/idempotency tests roll back all temporary changes.
begin;
do $$
declare v jsonb; before_products jsonb; after_products jsonb; rejected boolean:=false;
begin
 if (select count(*) from public.parking_pass_sources where enabled)<>10 then raise exception 'EXPECTED_TEN_SOURCES';end if;
 if has_table_privilege('anon','public.parking_pass_snapshots','SELECT') or has_function_privilege('anon','public.parking_pass_begin()','EXECUTE') then raise exception 'ANON_WRITE_OR_TABLE_ACCESS';end if;
 select jsonb_agg(jsonb_build_object('id',parking_id,'products',products,'date',query_date) order by parking_id) into before_products from public.parking_pass_snapshots;
 v:=public.parking_pass_begin();if coalesce((v->>'busy')::boolean,false) then raise exception 'BUSY_RETRY_LATER';end if;
 if not (public.parking_pass_begin()->>'busy')::boolean then raise exception 'DUPLICATE_RUN_NOT_BLOCKED';end if;
 perform public.parking_pass_finish((v->>'run_id')::uuid,(v->>'query_date')::date,
 (select jsonb_agg(jsonb_build_object('parking_id',parking_id,'status','ERROR','error_code','CONTRACT_TEST_ROLLBACK')) from public.parking_pass_sources where enabled));
 select jsonb_agg(jsonb_build_object('id',parking_id,'products',products,'date',query_date) order by parking_id) into after_products from public.parking_pass_snapshots;
 if before_products is distinct from after_products then raise exception 'LAST_SUCCESS_OVERWRITTEN';end if;
 begin perform public.parking_pass_finish((v->>'run_id')::uuid,(v->>'query_date')::date,'[]'::jsonb);exception when others then rejected:=true;end;
 if not rejected then raise exception 'FINISHED_RUN_ACCEPTED';end if;
end $$;
rollback;
select 'PASS: 10 sources, private tables/RPC, duplicate lock, preserve success on failure, repeated finish rejected; test changes rolled back' as result;
