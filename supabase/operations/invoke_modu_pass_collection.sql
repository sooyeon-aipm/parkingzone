-- Existing Vault credentials stay inside the same project's DB. No secret values are returned.
select net.http_post(
 url:='https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/collect-modu-passes',
 headers:=jsonb_build_object('Content-Type','application/json',
  'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='parking_collector_gateway_jwt'),
  'apikey',(select decrypted_secret from vault.decrypted_secrets where name='parking_collector_api_key')),
 body:='{}'::jsonb,timeout_milliseconds:=150000
) as request_id;
