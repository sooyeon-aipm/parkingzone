import {createHandler} from './handler.mjs';

const handler = createHandler({env: {
  NAVER_SEARCH_CLIENT_ID: Deno.env.get('NAVER_SEARCH_CLIENT_ID'),
  NAVER_SEARCH_CLIENT_SECRET: Deno.env.get('NAVER_SEARCH_CLIENT_SECRET'),
}});

Deno.serve(async (request: Request) => {
  const headers = Object.fromEntries(request.headers.entries());
  headers.host = new URL(request.url).host;
  let body = '';
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length')) > 2048) return Response.json({error:'INVALID_QUERY'}, {status:413});
    const reader = request.body?.getReader();
    const parts: Uint8Array[] = []; let size = 0;
    if (reader) while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) {await reader.cancel();return Response.json({error:'INVALID_QUERY'}, {status:413});}
      parts.push(value);
    }
    const bytes = new Uint8Array(size);let offset=0;
    for (const part of parts) {bytes.set(part,offset);offset+=part.length;}
    body = new TextDecoder().decode(bytes);
  }
  const outgoing: Record<string,string> = {};
  let status=200;
  const res = {
    setHeader(key:string,value:string) {outgoing[key]=value;},
    status(value:number) {status=value;return this;},
    json(value:unknown) {return Response.json(value,{status,headers:outgoing});},
  };
  return await handler({method:request.method, headers, body}, res);
});
