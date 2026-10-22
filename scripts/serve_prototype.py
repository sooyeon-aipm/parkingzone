#!/usr/bin/env python3
"""모바일 프로토타입 + 읽기 전용 DB 현황 프록시. 표준 라이브러리만 사용한다."""
import argparse
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'config' / 'parking-public.json'


def fetch_snapshot():
    config = json.loads(CONFIG.read_text())
    # 이 설정은 공개 anon 키다. 서버 secret/service_role 키를 로컬에 저장하지 않는다.
    payload = config['anon_key'].split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    if claims.get('role') != 'anon' or config['status_url'] != 'https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/parking-status':
        raise ValueError('Public parking configuration required')
    request = Request(config['status_url'], headers={
        'Authorization': f"Bearer {config['anon_key']}",
        'apikey': config['anon_key'], 'Accept': 'application/json',
    })
    with urlopen(request, timeout=20) as response:
        data = json.loads(response.read(512_001))
    if data.get('data_origin') != 'LIVE' or not isinstance(data.get('lots'), list) or len(data['lots']) > 15:
        raise ValueError('Unexpected snapshot')
    return data


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # 루프백 전용 서버이며 다른 Origin의 브라우저 호출은 허용하지 않는다.
        if self.headers.get('Host') not in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}:
            self.send_error(403)
            return
        if self.path.startswith('/api/'):
            if self.path != '/api/parking':
                self.send_error(404)
                return
            try:
                data, status = fetch_snapshot(), 200
            except Exception:
                # 키·요청 헤더·상세 원본 오류를 브라우저와 로그에 남기지 않는다.
                data, status = {'error': 'PARKING_READ_FAILED'}, 502
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=ROOT / 'prototype'))
    print(f'프로토타입: http://127.0.0.1:{args.port}/?data=live', flush=True)
    server.serve_forever()
