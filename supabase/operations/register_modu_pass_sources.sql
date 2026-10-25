-- Confirmed user mappings; web IDs validated against source name/address.
begin;
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('4e9357ca-5450-544f-b99b-b3dbe673dc29',262904,'서울숲IT밸리 주차장','서울 성동구 성수동1가 13-166');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('47bc4e54-7d49-5057-9fcc-b8273525a8b1',267670,'아마노 무신사S1 주차장','서울 성동구 성수동2가 324-2');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('fc63d499-90e8-58a6-b6e8-6f96818e6b0d',269161,'아마노 팩토리얼 성수 주차장','서울 성동구 성수동2가 314-11');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('242929a2-08ae-5cbb-a563-5b5d55a01232',263983,'아마노 무신사E1 주차장','서울 성동구 성수동2가 271-22');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('265689e3-e0b5-5d2d-bdba-67ea4b6d77a5',269453,'아마노 베이스성수 주차장','서울 성동구 성수동2가 269-62');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('c7e1aedd-3112-5192-984a-1dff177f201e',266083,'투루파킹 서울숲메가박스스퀘어 주차장','서울 성동구 성수동1가 656-335');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('a8e03d7f-f5ae-5ae8-92cc-5ade52467610',27990,'Tmap주차 갤러리아포레더몰 주차장','서울 성동구 성수동1가 685-696');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('71526098-5957-53ad-aa71-5082a32e299c',263680,'케이엠파크 슈퍼패스트서울숲 주차장','서울 성동구 성수동1가 656-1731');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('c5940038-d14e-5bd2-a8a2-1b7682b49e3e',267781,'아마노 센터포인트성수 주차장','서울 성동구 성수동2가 280-11');
insert into public.parking_pass_sources(parking_id,provider_id,expected_name,expected_address) values('8f81431b-9018-5982-9327-c3a74c7c59bc',261807,'서울숲디타워 주차장','서울 성동구 성수동1가 685-700');
commit;
select count(*) as enabled_sources from public.parking_pass_sources where enabled;
