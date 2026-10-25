select id,started_at,finished_at,status,query_date,results from public.parking_pass_runs order by started_at desc limit 3;
select s.parking_id,p.name,s.query_date,jsonb_array_length(s.products) as products,s.collected_at,s.last_result,s.last_error from public.parking_pass_snapshots s join public.parking_lots p on p.id=s.parking_id order by p.name;
select status_code,content,error_msg from net._http_response order by created desc limit 3;
