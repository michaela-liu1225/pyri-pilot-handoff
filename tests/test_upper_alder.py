"""New-site API journey, including persisted evidence through failure/restart."""

import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from app import create_app


class UpperAlderJourney(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "handoffs.sqlite3"
        self.client = TestClient(create_app(self.db, password_hash=""))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.tmp.cleanup()

    def briefing(self, snapshot="handoff", mode="normal"):
        response = self.client.get("/api/sites/upper-alder/briefing", params={"snapshot": snapshot, "weather_mode": mode})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_both_cutoffs_produce_source_backed_site_briefings(self):
        morning, afternoon = self.briefing("briefing"), self.briefing()
        self.assertIn("reported passable", morning["summary"])
        self.assertIn("reported blocked", afternoon["summary"])
        self.assertEqual(afternoon["attention"][0]["evidence_ids"], ["FR-03", "FR-04"])
        self.assertEqual(afternoon["attention"][0]["id"], "access-intake-spur")
        for briefing in [morning, afternoon]:
            self.assertEqual(len(briefing["sensors"]), 3)
            self.assertLess(len(json.dumps(briefing)), 64000)
            self.assertNotIn("FR-05", json.dumps(briefing))
            self.assertNotIn("final_fire_perimeter", json.dumps(briefing))
            self.assertTrue(any(p.get("required_route_id") == "intake-spur" for p in briefing["plans"]))
            for evidence in briefing["evidence"]:
                self.assertLessEqual(evidence["available_at"], briefing["snapshot"]["as_of"])

    def test_saved_evidence_is_unchanged_by_failure_recovery_and_app_restart(self):
        original = self.briefing()
        response = self.client.post("/api/sites/upper-alder/handoffs", json={
            "snapshot_id": "handoff", "operator_note": "Confirm Intake Spur access and NODE-03 telemetry.",
            "evidence_snapshot": original,
        })
        self.assertEqual(response.status_code, 201)
        saved = response.json()
        self.assertEqual(saved["scenario_as_of"], "2021-08-31T00:00:00Z")
        self.assertNotEqual(saved["created_at"], saved["scenario_as_of"])
        for mode, state in [("unavailable", "unavailable"), ("stale", "stale"), ("normal", "recent")]:
            briefing = self.briefing(mode=mode)
            self.assertEqual(briefing["weather"]["state"], state)
            self.assertEqual(briefing["routes"], original["routes"])
            self.assertEqual(briefing["sensors"], original["sensors"])
            self.assertTrue(briefing["evidence"])
        with TestClient(create_app(self.db, password_hash="")) as restarted:
            restored = restarted.get("/api/sites/upper-alder/handoffs/" + saved["id"]).json()
            self.assertEqual(restored, saved)
            self.assertEqual(restored["evidence_snapshot"], original)
            self.assertEqual(restarted.get("/api/sites/pine-ridge/handoffs/" + saved["id"]).status_code, 404)

    def test_weather_failure_does_not_prevent_saving_a_new_handoff(self):
        briefing = self.briefing(mode="unavailable")
        response = self.client.post("/api/sites/upper-alder/handoffs", json={
            "snapshot_id": "handoff", "operator_note": "Weather unavailable. Recheck airport context later.",
            "evidence_snapshot": briefing,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["evidence_snapshot"]["weather"]["state"], "unavailable")


if __name__ == "__main__":
    unittest.main()
