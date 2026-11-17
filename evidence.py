"""Replay-safe evidence transformations, independent of HTTP and storage.

These rules describe the supplied tabletop evidence. They do not predict fire,
damage, route safety, or conditions between the three sensor locations.
"""

from datetime import datetime, timedelta, timezone
from math import ceil, isfinite
from typing import Any

Record = dict[str, Any]


def instant(value: Any) -> datetime | None:
    """Reject missing/naive timestamps instead of guessing their timezone."""
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return result.astimezone(timezone.utc) if result.tzinfo else None
    except (ValueError, TypeError):
        return None


def number(value: Any) -> float | None:
    """CSV blanks and invalid numbers are missing; a numeric zero is retained."""
    try:
        result = float(value)
        return result if isfinite(result) else None
    except (ValueError, TypeError):
        return None


def available_records(records: list[Record], as_of: str) -> list[Record]:
    cutoff = instant(as_of)
    if cutoff is None:
        raise ValueError("An explicit, timezone-aware replay cutoff is required")
    result = []
    for row in records:
        available = instant(row.get("available_at"))
        observed = instant(row.get("observed_at", row.get("assessed_at")))
        if available and observed and observed <= available <= cutoff:
            result.append(row)
    return result


def observation_order(record: Record) -> tuple[datetime, datetime]:
    return (instant(record.get("observed_at", record.get("assessed_at"))),
            instant(record["available_at"]))


def age_minutes(observed_at: str, as_of: str) -> float:
    return round((instant(as_of) - instant(observed_at)).total_seconds() / 60, 1)


def route_briefings(reports: list[Record], context: Record, as_of: str) -> list[Record]:
    """Unverified reports remain visible, but never clear an explicit blockage."""
    available = available_records(reports, as_of)
    plans = active_plans(context, as_of)
    needed = {p["required_route_id"] for p in plans if p.get("access_required")}
    routes = []
    for feature in context["routes"]["features"]:
        route_id = feature["id"]
        if route_id not in needed:
            continue
        relevant = sorted((r for r in available if r.get("route_id") == route_id),
                          key=observation_order)
        explicit = [r for r in relevant if r.get("status") in {"passable", "blocked"}]
        latest = explicit[-1] if explicit else None
        uncertain = [r for r in relevant if r.get("status") not in {"passable", "blocked"}
                     and (latest is None or observation_order(r) >= observation_order(latest))]
        state = "reported_" + latest["status"] if latest else ("unverified" if relevant else "unknown")
        routes.append({
            "id": route_id, "name": feature["properties"]["name"], "state": state,
            "report": dict(latest) if latest else None,
            "age_minutes": age_minutes(latest["observed_at"], as_of) if latest else None,
            "unverified_reports": [dict(r) for r in uncertain],
            "affected_targets": [p["target_id"] for p in plans if p.get("required_route_id") == route_id],
            "interpretation": "A recorded access report is not a guarantee of current passability. Confirm access before field work.",
        })
    return routes


def active_plans(context: Record, as_of: str) -> list[Record]:
    cutoff = instant(as_of)
    return [dict(p) for p in context["plans"]
            if instant(p.get("effective_from")) and instant(p["effective_from"]) <= cutoff]


def sensor_reading(row: Record) -> Record:
    return {
        "id": row["packet_id"], "observed_at": row["observed_at"],
        "available_at": row["available_at"], "quality": row.get("quality", "unknown"),
        "temperature_c": number(row.get("temperature_c")),
        "relative_humidity_pct": number(row.get("relative_humidity_pct")),
        "battery_pct": number(row.get("battery_pct")),
    }


def sensor_briefings(records: list[Record], sensors: Record, as_of: str) -> list[Record]:
    available = available_records(records, as_of)
    result = []
    for feature in sensors["features"]:
        sensor_id, properties = feature["id"], feature["properties"]
        interval = number(properties.get("nominal_interval_minutes")) or 5
        rows = sorted((r for r in available if r.get("sensor_id") == sensor_id),
                      key=lambda r: instant(r["available_at"]))
        # Filter by availability before deduplicating. A later replay packet must
        # not replace one that the operator could already see at the cutoff.
        packets: dict[str, Record] = {}
        conflicts: set[str] = set()
        for row in rows:
            packet_id = row["packet_id"]
            if packet_id in packets:
                fields = ("observed_at", "temperature_c", "relative_humidity_pct", "battery_pct", "quality")
                if any(row.get(k) != packets[packet_id].get(k) for k in fields):
                    conflicts.add(packet_id)
            else:
                packets[packet_id] = row
        unique = sorted(packets.values(), key=observation_order)
        good = [r for r in unique if r.get("quality") == "good"
                and number(r.get("temperature_c")) is not None and r["packet_id"] not in conflicts]
        flagged = [r for r in unique if r not in good]
        latest = good[-1] if good else None
        last_packet = unique[-1] if unique else None
        age = age_minutes(latest["observed_at"], as_of) if latest else None
        stale_after = 3 * interval
        state = "missing" if latest is None else ("stale" if age > stale_after else "recent")
        if last_packet and last_packet not in good and state == "recent":
            state = "needs_review"
        gaps = []
        for before, after in zip(unique, unique[1:]):
            elapsed = age_minutes(before["observed_at"], after["observed_at"])
            missing = max(0, ceil(elapsed / interval) - 1)
            if missing:
                gaps.append({"after": before["observed_at"], "before": after["observed_at"],
                             "missing_samples": missing})
        recent = [r for r in good if instant(r["observed_at"]) >= instant(as_of) - timedelta(hours=1)]
        trend = None
        if len(recent) >= 2:
            first, last = recent[0], recent[-1]
            trend = {
                "from_id": first["packet_id"], "to_id": last["packet_id"],
                "from_at": first["observed_at"], "to_at": last["observed_at"],
                "from_temperature_c": number(first["temperature_c"]),
                "to_temperature_c": number(last["temperature_c"]),
                "change_c": round(number(last["temperature_c"]) - number(first["temperature_c"]), 1),
                "elapsed_minutes": age_minutes(first["observed_at"], last["observed_at"]),
                "note": "Endpoint change between quality-good samples; no interpolation across missing or flagged readings.",
            }
        result.append({
            "id": sensor_id, "name": properties["name"], "source": "Simulated point sensor",
            "source_kind": properties["source_kind"], "state": state, "age_minutes": age,
            "nominal_interval_minutes": interval, "stale_after_minutes": stale_after,
            "latest": sensor_reading(latest) if latest else None,
            "latest_packet": sensor_reading(last_packet) if last_packet else None,
            "available_packets": len(unique), "good_packets": len(good),
            "duplicates_removed": len(rows) - len(unique), "flagged_count": len(flagged),
            "flagged_examples": [sensor_reading(r) for r in flagged[-3:]],
            "conflicting_packets": sorted(conflicts), "gaps": gaps,
            "missing_samples_between_observations": sum(g["missing_samples"] for g in gaps),
            "trend": trend, "measurement_support": properties["measurement_support"],
        })
    return result


def assessment_briefings(records: list[Record], context: Record, as_of: str) -> list[Record]:
    available = available_records(records, as_of)
    features = context["aois"]["features"] + context["assets"]["features"]
    result = []
    for feature in features:
        matching = [r for r in available if r["target_id"] == feature["id"]]
        latest = max(matching, key=observation_order) if matching else None
        value = number(latest["value"]) if latest else None
        result.append({
            "target_id": feature["id"], "name": feature["properties"]["name"],
            "value": value, "unit": latest["unit"] if latest else None,
            "state": "assessed" if value is not None else ("missing_value" if latest else "not_assessed"),
            "record": dict(latest) if latest else None,
        })
    return result


def weather_context(records: list[Record], mode: str, as_of: str) -> Record:
    """Mirror the supplied weather failure controls without a self-HTTP request."""
    candidates = [] if mode == "unavailable" else (records[:1] if mode == "stale" else records)
    available = available_records(candidates, as_of)
    latest = max(available, key=observation_order) if available else None
    age = age_minutes(latest["observed_at"], as_of) if latest else None
    state = ("unavailable" if mode == "unavailable" else "missing") if latest is None else (
        "stale" if age > 90 else "recent")
    return {
        "mode": mode, "state": state, "record": dict(latest) if latest else None,
        "age_minutes": age, "stale_after_minutes": 90,
        "source": "Archived TVL airport weather; assumed ten-minute replay delivery lag",
        "interpretation": "Airport context only, not reserve-wide weather. Missing or stale weather does not establish safe conditions.",
    }
