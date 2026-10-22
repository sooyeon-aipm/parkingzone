-- 읽기 전용: 테이블별 컬럼 수·RLS 확인.
select c.relname as table_name,
       (select count(*) from information_schema.columns i
        where i.table_schema = 'public' and i.table_name = c.relname) as column_count,
       c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('parking_lots', 'parking_observations', 'parking_collection_attempts')
order by c.relname;
