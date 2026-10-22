-- 실제 DB 제약 검사. 검사 데이터는 내부 트랜잭션을 되돌려 남기지 않는다.
-- 예상하지 못한 오류는 잡지 않고 중단한다. PASS는 모든 검사가 통과한 경우만 반환한다.
do $checks$
declare
    lot_id uuid := gen_random_uuid();
    attempt_id uuid := gen_random_uuid();
    retry_id uuid := gen_random_uuid();
    observation_id uuid := gen_random_uuid();
    test_time timestamptz := now();
begin
  begin
    insert into public.parking_lots (id, name, address, source)
    values (lot_id, 'DB 제약 검사 전용', '가상 주소', 'constraint_test');

    insert into public.parking_collection_attempts
        (id, parking_id, started_at, finished_at, result_status)
    values (attempt_id, lot_id, test_time, test_time, 'SUCCESS');
    insert into public.parking_observations
        (id, parking_id, total_spaces, available_spaces, source_updated_at,
         collected_at, quality_status, collection_attempt_id)
    values (observation_id, lot_id, 10, 2, test_time, test_time, 'VALID', attempt_id);

    -- 1. 없는 주차장 외래키 거절
    begin
      insert into public.parking_observations
          (parking_id, total_spaces, available_spaces, collected_at, quality_status)
      values (gen_random_uuid(), 10, 2, test_time, 'SOURCE_TIME_MISSING');
      raise exception 'FK 검사가 입력을 거절하지 않았음';
    exception when foreign_key_violation then null;
    end;

    -- 2. 전체보다 큰 가능 면수 거절
    begin
      insert into public.parking_observations
          (parking_id, total_spaces, available_spaces, collected_at, quality_status)
      values (lot_id, 10, 11, test_time, 'SOURCE_TIME_MISSING');
      raise exception '면수 범위 검사가 입력을 거절하지 않았음';
    exception when check_violation then null;
    end;

    -- 3. 같은 수집 시도의 상태 중복 거절
    begin
      insert into public.parking_observations
          (parking_id, total_spaces, available_spaces, source_updated_at,
           collected_at, quality_status, collection_attempt_id)
      values (lot_id, 10, 2, test_time, test_time, 'VALID', attempt_id);
      raise exception '수집 시도 중복 검사가 입력을 거절하지 않았음';
    exception when unique_violation then null;
    end;

    -- 4. 시각이 없는데 VALID인 상태 거절
    begin
      insert into public.parking_observations
          (parking_id, total_spaces, available_spaces, collected_at, quality_status)
      values (lot_id, 10, 2, test_time, 'VALID');
      raise exception '품질-시각 검사가 입력을 거절하지 않았음';
    exception when check_violation then null;
    end;

    -- 5. 수집 시각보다 미래인 원천 시각 거절
    begin
      insert into public.parking_observations
          (parking_id, total_spaces, available_spaces, source_updated_at,
           collected_at, quality_status)
      values (lot_id, 10, 2, test_time + interval '1 second', test_time, 'VALID');
      raise exception '시각 순서 검사가 입력을 거절하지 않았음';
    exception when check_violation then null;
    end;

    -- 6. 연결된 이력이 있는 주차장 삭제 제한
    begin
      delete from public.parking_lots where id = lot_id;
      raise exception '주차장 삭제 제한이 적용되지 않았음';
    exception when foreign_key_violation then null;
    end;

    -- 7. 진행 중인데 종료 시각이 있는 수집 거절
    begin
      insert into public.parking_collection_attempts (parking_id, finished_at)
      values (lot_id, test_time);
      raise exception '수집 종료 조건 검사가 입력을 거절하지 않았음';
    exception when check_violation then null;
    end;

    -- 8. 원천 상태 이상도 결과로 저장할 수 있고 원본은 최소 오류 정보만 저장
    insert into public.parking_collection_attempts
        (parking_id, started_at, finished_at, result_status, error_code, error_message)
    values (lot_id, test_time, test_time, 'SOURCE_UNAVAILABLE',
            'SOURCE_STATUS_3', '검사용 원천 통신 점검');

    -- 9. 성공한 수집에 오류 원본을 저장하는 입력 거절
    begin
      insert into public.parking_collection_attempts
          (parking_id, started_at, finished_at, result_status, raw_payload)
      values (lot_id, test_time, test_time, 'SUCCESS', '{"test":true}'::jsonb);
      raise exception '성공 원본 저장 제한이 적용되지 않았음';
    exception when check_violation then null;
    end;

    -- 10. 수집 부모 삭제 시 이력과 재시도는 남고 연결만 NULL로 변경
    insert into public.parking_collection_attempts
        (id, parking_id, started_at, result_status, retry_of_id)
    values (retry_id, lot_id, test_time, 'IN_PROGRESS', attempt_id);
    delete from public.parking_collection_attempts where id = attempt_id;
    if not exists (select 1 from public.parking_observations
                   where id = observation_id and collection_attempt_id is null)
       or not exists (select 1 from public.parking_collection_attempts
                      where id = retry_id and retry_of_id is null) then
      raise exception '부모 삭제 시 NULL 연결 처리 실패';
    end if;

    -- 위 검사 데이터 전체만 되돌린다. 실제 시설·이력은 변경하지 않는다.
    raise exception using errcode = 'PZ001', message = 'ROLLBACK_TEST_FIXTURE';
  exception when sqlstate 'PZ001' then null;
  end;
end
$checks$;

select 'PASS' as result, 10 as checked_cases,
       '검사 데이터는 저장하지 않음' as fixture_handling;
