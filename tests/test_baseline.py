import hashlib
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from app import create_app


class ExistingJourney(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "handoffs.sqlite3"
        self.client = TestClient(create_app(self.db, password_hash=""))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.tmp.cleanup()

    def test_existing_site_and_cutoffs(self):
        self.assertEqual(self.client.get('/healthz').json()['status'], 'ok')
        self.assertIn('Pilot workspace', self.client.get('/').text)
        self.assertEqual({s['id'] for s in self.client.get('/api/sites').json()}, {'pine-ridge', 'upper-alder'})
        briefing = self.client.get('/api/sites/pine-ridge/briefing?snapshot=handoff').json()
        self.assertEqual(briefing['snapshot']['as_of'], '2021-08-31T00:00:00Z')
        self.assertEqual(briefing['evidence'][0]['id'], 'PR-01')

    def test_persistent_handoff_and_site_isolation(self):
        briefing = self.client.get('/api/sites/pine-ridge/briefing').json()
        data = {'snapshot_id':'briefing', 'operator_note':'Check the gate before dispatch.', 'evidence_snapshot':briefing}
        response = self.client.post('/api/sites/pine-ridge/handoffs', json=data)
        self.assertEqual(response.status_code, 201)
        handoff = response.json()
        with TestClient(create_app(self.db, password_hash="")) as restarted:
            restored = restarted.get('/api/sites/pine-ridge/handoffs/' + handoff['id'])
            self.assertEqual(restored.json()['evidence_snapshot'], briefing)
            self.assertEqual(restarted.get('/api/sites/upper-alder/handoffs/' + handoff['id']).status_code, 404)
        self.assertEqual(self.client.post('/api/sites/pine-ridge/handoffs', json={**data, 'operator_note':' '}).status_code, 422)
        self.assertEqual(self.client.post('/api/sites/pine-ridge/handoffs', json={**data, 'snapshot_id':'handoff'}).status_code, 422)

    def test_replay_controls_and_late_data_are_available(self):
        normal = self.client.get('/api/sites/upper-alder/feeds/weather').json()['records']
        stale = self.client.get('/api/sites/upper-alder/feeds/weather?mode=stale').json()['records']
        self.assertGreater(len(normal), len(stale))
        self.assertEqual(len(stale), 1)
        self.assertEqual(self.client.get('/api/sites/upper-alder/feeds/weather?mode=unavailable').status_code, 503)
        self.assertEqual(self.client.get('/api/sites/upper-alder/feeds/weather').status_code, 200)
        reports = self.client.get('/api/sites/upper-alder/feeds/reports').json()['records']
        self.assertTrue(any(r['available_at'] > '2021-08-31T00:00:00Z' for r in reports))
        self.assertEqual(self.client.get('/api/sites/unknown/context').status_code, 404)
        self.assertEqual(self.client.get('/api/sites/pine-ridge/briefing?snapshot=unknown').status_code, 400)
        self.assertEqual(self.client.get('/api/sites/upper-alder/feeds/weather?mode=bad').status_code, 422)

    def test_existing_site_survives_optional_weather_failure(self):
        response = self.client.get('/api/sites/pine-ridge/briefing?weather_mode=unavailable')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['evidence'])
        self.assertIsNone(response.json()['weather']['record'])

    def test_demo_login(self):
        password = 'test-only-password'
        digest = hashlib.sha256(password.encode()).hexdigest()
        with TestClient(create_app(self.db, password_hash=digest)) as protected:
            self.assertEqual(protected.get('/healthz').status_code, 200)
            self.assertEqual(protected.get('/').status_code, 401)
            self.assertEqual(protected.get('/api/sites', auth=('reviewer', password)).status_code, 200)
            self.assertEqual(protected.get('/api/sites', auth=('reviewer', 'wrong')).status_code, 401)


if __name__ == '__main__':
    unittest.main()
