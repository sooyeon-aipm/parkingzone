-- 새 RPC의 실DB 검사. 모든 검사 데이터·수정은 마지막 내부 예외로 되돌린다.
do $checks$
declare
  run jsonb; again jsonb; results jsonb := '[]'::jsonb; t jsonb; reply jsonb;
  root_id uuid := gen_random_uuid(); old_id uuid := gen_random_uuid();
  keep_id uuid := gen_random_uuid(); keep_observation uuid := gen_random_uuid();
  retry_id uuid; lot uuid; stamp timestamptz := clock_timestamp();
begin
  begin
    run := public.parking_begin_collection();
    if (run->>'busy')::boolean or jsonb_array_length(run->'tasks') = 0 then
      raise exception '검사를 시작할 수 없음: 실제 수집 실행 중이거나 등록 시설 없음';
    end if;
    -- 1. 실행 중인 작업이 있으면 새 실행 차단
    again := public.parking_begin_collection();
    if not (again->>'busy')::boolean then raise exception '중복 실행 차단 실패'; end if;
    lot := (run->'tasks'->0->>'parking_id')::uuid;

    -- 2. 다른 주차장으로 완료하려는 결과는 정상 저장 전에 거절
    begin
      perform public.parking_finish_collection(jsonb_build_array(jsonb_build_object(
        'id', run->'tasks'->0->>'id', 'parking_id', gen_random_uuid(), 'result_status', 'SUCCESS')));
      raise exception 'EXPECTED_IDENTITY_CHECK';
    exception when raise_exception then
      if sqlerrm <> '수집 결과 주차장 불일치' then raise; end if;
    end;

    for t in select value from jsonb_array_elements(run->'tasks') loop
      results := results || jsonb_build_array(jsonb_build_object(
        'id', t->>'id', 'parking_id', t->>'parking_id', 'result_status', 'SUCCESS',
        'total_spaces', 10, 'available_spaces', 2, 'source_updated_at', stamp - interval '1 minute',
        'collected_at', clock_timestamp(), 'quality_status', 'VALID'));
    end loop;
    -- 3. 상태 저장과 로그 종료가 함께 완료
    reply := public.parking_finish_collection(results);
    if (reply->>'observations_added')::integer <> jsonb_array_length(results) then
      raise exception '원자적 상태 저장 실패';
    end if;
    -- 4. 같은 완료 요청을 반복해도 새 상태 이력은 없음
    reply := public.parking_finish_collection(results);
    if (reply->>'observations_added')::integer <> 0 then raise exception '완료 중복 저장'; end if;

    -- 5. 접근 실패의 첫 재시도만 허용
    insert into public.parking_collection_attempts
      (id,parking_id,started_at,finished_at,result_status,error_code,error_message)
    values (root_id,lot,stamp-interval '40 seconds',stamp-interval '31 seconds',
            'FETCH_ERROR','SOURCE_HTTP','RPC 검사 전용');
    run := public.parking_begin_collection(array[root_id]);
    if jsonb_array_length(run->'tasks') <> 1 then raise exception '접근 실패 재시도 생성 실패'; end if;
    retry_id := (run->'tasks'->0->>'id')::uuid;
    perform public.parking_finish_collection(jsonb_build_array(jsonb_build_object(
      'id',retry_id,'parking_id',lot,'result_status','SOURCE_UNAVAILABLE',
      'error_code','SOURCE_STATUS_3','error_message','RPC 검사 전용')));
    run := public.parking_begin_collection(array[root_id]);
    if jsonb_array_length(run->'tasks') <> 0 then raise exception '같은 부모의 추가 재시도 허용됨'; end if;

    -- 6. 7일 만료 삭제와 별도 기준으로 남는 상태의 FK 처리
    insert into public.parking_collection_attempts
      (id,parking_id,started_at,finished_at,result_status)
    values (old_id,lot,stamp-interval '8 days',stamp-interval '8 days','SUCCESS'),
           (keep_id,lot,stamp-interval '8 days',stamp-interval '8 days','SUCCESS');
    insert into public.parking_observations
      (parking_id,total_spaces,available_spaces,source_updated_at,collected_at,quality_status,collection_attempt_id)
    values (lot,10,2,stamp-interval '8 days',stamp-interval '8 days','VALID',old_id);
    insert into public.parking_observations
      (id,parking_id,total_spaces,available_spaces,source_updated_at,collected_at,quality_status,collection_attempt_id)
    values (keep_observation,lot,10,2,stamp-interval '1 minute',stamp,'VALID',keep_id);
    reply := public.parking_purge_expired_records();
    if (reply->>'observations_removed')::integer < 1 or (reply->>'attempts_removed')::integer < 2
       or not exists (select 1 from public.parking_observations
                      where id=keep_observation and collection_attempt_id is null) then
      raise exception '7일 정리 및 연결 유지 실패';
    end if;
    -- 7. 익명·일반 로그인 사용자에게 수집 쓰기 권한을 열지 않음
    if has_function_privilege('anon','public.parking_begin_collection(uuid[])','EXECUTE')
       or has_function_privilege('authenticated','public.parking_finish_collection(jsonb)','EXECUTE')
       or has_function_privilege('anon','public.parking_purge_expired_records()','EXECUTE') then
      raise exception '수집 RPC 접근 제한 실패';
    end if;
    raise exception using errcode='PZ001',message='ROLLBACK_RPC_FIXTURES';
  exception when sqlstate 'PZ001' then null;
  end;
end
$checks$;
select 'PASS' as result, 7 as checked_cases, '검사 데이터는 되돌림' as fixture_handling;
