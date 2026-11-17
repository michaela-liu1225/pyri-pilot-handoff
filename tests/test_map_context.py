"""Verify the supplied map can load without completing the candidate's task."""
import hashlib
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from app import create_app


class MapContext(unittest.TestCase):
    def test_context_is_available_with_new_site_unfinished(self):
        with tempfile.TemporaryDirectory() as temp, TestClient(create_app(Path(temp)/'test.db', password_hash='')) as client:
            context = client.get('/api/sites/upper-alder/context').json()['context']
            self.assertEqual(len(context['aois']['features']), 1)
            self.assertEqual(len(context['assets']['features']), 4)
            self.assertEqual(len(context['point_sensors']['features']), 3)
            assets = {feature['id']: feature for feature in context['assets']['features']}
            self.assertEqual(assets['echo-intake']['geometry']['type'], 'Polygon')
            self.assertEqual(assets['north-cache']['geometry']['coordinates'], [-120.054, 38.953])
            pine = client.get('/api/sites/pine-ridge/context').json()['context']
            self.assertNotIn('aois', pine)  # Do not substitute another site's geometry.
            self.assertEqual(client.get('/api/sites/pine-ridge/briefing').status_code, 200)

    def test_every_bundled_map_asset_is_served_and_requires_demo_login(self):
        password = 'map-test-only'
        digest = hashlib.sha256(password.encode()).hexdigest()
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as temp, TestClient(create_app(Path(temp)/'test.db', password_hash=digest)) as client:
            self.assertEqual(client.get('/static/app.js').status_code, 401)
            for path in (root/'static').rglob('*'):
                if path.is_file():
                    response = client.get('/'+path.relative_to(root).as_posix(), auth=('reviewer',password))
                    self.assertEqual(response.status_code, 200, path.name)
                    self.assertEqual(response.content, path.read_bytes(), path.name)
            self.assertEqual(client.get('/static/missing.png', auth=('reviewer',password)).status_code, 404)
            self.assertEqual(client.get('/static/%2e%2e/app.py', auth=('reviewer',password)).status_code, 404)


if __name__ == '__main__':
    unittest.main()
