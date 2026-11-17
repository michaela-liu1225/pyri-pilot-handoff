"""Independent expected outcomes from the supplied fixture rows and catalog."""

import unittest
from copy import deepcopy

from app import UPPER_CONTEXT, UPPER_FEEDS
from evidence import (assessment_briefings, available_records, number,
                      route_briefings, sensor_briefings, weather_context)

MORNING = "2021-08-30T18:00:00Z"
HANDOFF = "2021-08-31T00:00:00Z"


class EvidenceRules(unittest.TestCase):
    def test_late_reopening_is_excluded_until_delivery(self):
        reports = UPPER_FEEDS["reports"]
        self.assertEqual([r["id"] for r in available_records(reports, MORNING)], ["FR-01", "FR-02"])
        self.assertEqual([r["id"] for r in available_records(reports, HANDOFF)],
                         ["FR-01", "FR-02", "FR-03", "FR-04"])
        routes = {r["id"]: r for r in route_briefings(reports, UPPER_CONTEXT, HANDOFF)}
        self.assertEqual(routes["intake-spur"]["state"], "reported_blocked")
        self.assertEqual(routes["intake-spur"]["report"]["id"], "FR-03")
        self.assertEqual([r["id"] for r in routes["intake-spur"]["unverified_reports"]], ["FR-04"])
        delivered = route_briefings(reports, UPPER_CONTEXT, "2021-08-31T00:20:00Z")
        intake = next(r for r in delivered if r["id"] == "intake-spur")
        self.assertEqual(intake["state"], "reported_passable")
        self.assertEqual(intake["report"]["id"], "FR-05")

    def test_unverified_and_missing_reports_do_not_become_passable(self):
        uncertain = [r for r in UPPER_FEEDS["reports"] if r["status"] == "unverified"]
        routes = {r["id"]: r for r in route_briefings(uncertain, UPPER_CONTEXT, HANDOFF)}
        self.assertEqual(routes["intake-spur"]["state"], "unverified")
        self.assertIsNone(routes["intake-spur"]["report"])
        self.assertEqual(routes["meadow-road"]["state"], "unknown")

    def test_sensor_cutoff_uses_delivery_not_observation(self):
        sensors = {s["id"]: s for s in sensor_briefings(UPPER_FEEDS["sensors"], UPPER_CONTEXT["point_sensors"], HANDOFF)}
        west = sensors["NODE-03"]
        self.assertEqual(west["latest"]["id"], "NODE-03-089")
        self.assertEqual(west["latest"]["temperature_c"], 28.6)
        self.assertEqual(west["age_minutes"], 35)
        self.assertEqual(west["state"], "stale")
        self.assertEqual(west["trend"]["elapsed_minutes"], 25)
        self.assertEqual(sensors["NODE-02"]["missing_samples_between_observations"], 11)
        self.assertEqual(sensors["NODE-01"]["duplicates_removed"], 1)
        self.assertEqual(sensors["NODE-01"]["flagged_count"], 2)
        self.assertEqual(sensors["NODE-01"]["good_packets"], 94)

    def test_flagged_spike_does_not_become_latest_reliable_temperature(self):
        rows = sensor_briefings(UPPER_FEEDS["sensors"], UPPER_CONTEXT["point_sensors"], "2021-08-30T21:21:00Z")
        central = next(r for r in rows if r["id"] == "NODE-01")
        self.assertEqual(central["latest_packet"]["temperature_c"], 87)
        self.assertEqual(central["latest"]["id"], "NODE-01-062")
        self.assertNotEqual(central["latest"]["temperature_c"], 87)
        self.assertEqual(central["state"], "needs_review")
        self.assertLess(central["trend"]["to_temperature_c"], 87)

    def test_duplicate_conflict_is_excluded_without_mutating_input(self):
        first = deepcopy(UPPER_FEEDS["sensors"][0])
        second = {**first, "temperature_c": "99", "available_at": "2021-08-30T16:02:00Z"}
        rows = [first, second]
        before = deepcopy(rows)
        result = sensor_briefings(rows, UPPER_CONTEXT["point_sensors"], MORNING)[0]
        self.assertEqual(result["conflicting_packets"], [first["packet_id"]])
        self.assertIsNone(result["latest"])
        self.assertEqual(rows, before)

    def test_missing_sensors_and_invalid_numbers_remain_missing(self):
        results = sensor_briefings([], UPPER_CONTEXT["point_sensors"], MORNING)
        self.assertTrue(all(s["state"] == "missing" and s["latest"] is None for s in results))
        self.assertIsNone(number(""))
        self.assertIsNone(number("nan"))
        self.assertEqual(number("0"), 0)

    def test_zero_assessment_is_distinct_from_absence(self):
        rows = {r["target_id"]: r for r in assessment_briefings(UPPER_FEEDS["assessments"], UPPER_CONTEXT, HANDOFF)}
        self.assertEqual(rows["meadow-yard"]["value"], 0)
        self.assertEqual(rows["meadow-yard"]["state"], "assessed")
        self.assertIsNone(rows["north-cache"]["value"])
        self.assertEqual(rows["north-cache"]["state"], "not_assessed")
        self.assertEqual(rows["upper-alder"]["value"], 22)

    def test_weather_failure_staleness_and_recovery(self):
        weather = UPPER_FEEDS["weather"]
        fresh = weather_context(weather, "normal", HANDOFF)
        self.assertEqual(fresh["record"]["id"], "TVL-095")
        self.assertEqual(fresh["state"], "recent")
        self.assertEqual(fresh["age_minutes"], 22)
        self.assertEqual(weather_context(weather, "stale", HANDOFF)["state"], "stale")
        self.assertIsNone(weather_context(weather, "unavailable", HANDOFF)["record"])
        self.assertEqual(weather_context(weather, "normal", HANDOFF), fresh)

    def test_availability_boundary_and_invalid_clock(self):
        row = {"observed_at": "2021-08-30T17:55:00Z", "available_at": MORNING}
        self.assertEqual(available_records([row], MORNING), [row])
        self.assertEqual(available_records([{**row, "available_at": "invalid"}], MORNING), [])
        self.assertEqual(available_records([{**row, "observed_at": "2021-08-31T01:00:00Z"}], MORNING), [])
        with self.assertRaises(ValueError):
            available_records([row], "2021-08-30T18:00:00")


if __name__ == "__main__":
    unittest.main()
