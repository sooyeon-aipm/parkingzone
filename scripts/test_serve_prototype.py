import base64
import json
import unittest
from unittest.mock import MagicMock, patch
import serve_prototype as server


def config(role='anon'):
    payload = base64.urlsafe_b64encode(json.dumps({'role': role}).encode()).decode().rstrip('=')
    return {'anon_key': f'e30.{payload}.test', 'status_url': 'https://ksuzhoeahgqbvrbchwpb.supabase.co/functions/v1/parking-status'}


class PublicProxyTests(unittest.TestCase):
    def test_server_credentials_rejected_before_network(self):
        path = MagicMock()
        path.read_text.return_value = json.dumps(config('service_role'))
        with patch.object(server, 'CONFIG', path), patch.object(server, 'urlopen') as fetch:
            with self.assertRaises(ValueError):
                server.fetch_snapshot()
            fetch.assert_not_called()

    def test_only_fixed_read_endpoint(self):
        data = config()
        data['status_url'] = 'https://example.com/other'
        path = MagicMock()
        path.read_text.return_value = json.dumps(data)
        with patch.object(server, 'CONFIG', path), patch.object(server, 'urlopen') as fetch:
            with self.assertRaises(ValueError):
                server.fetch_snapshot()
            fetch.assert_not_called()

    def test_live_response_and_no_demo_fallback(self):
        path = MagicMock()
        path.read_text.return_value = json.dumps(config())
        with patch.object(server, 'CONFIG', path), patch.object(server, 'urlopen') as fetch:
            fetch.return_value.__enter__.return_value.read.return_value = b'{"data_origin":"LIVE","lots":[]}'
            self.assertEqual(server.fetch_snapshot()['data_origin'], 'LIVE')
            self.assertEqual(fetch.call_args.args[0].get_method(), 'GET')
            fetch.return_value.__enter__.return_value.read.return_value = b'{"data_origin":"DEMO","lots":[]}'
            with self.assertRaises(ValueError):
                server.fetch_snapshot()


if __name__ == '__main__':
    unittest.main()
