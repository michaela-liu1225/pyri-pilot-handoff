"""Existing product logic. Add the Upper Alder workflow here or refactor it."""

from typing import Any

from evidence import (active_plans, assessment_briefings, route_briefings,
                      sensor_briefings, weather_context)


def pine_ridge_briefing(snapshot: dict[str, Any], records: dict[str, Any], weather_mode: str) -> dict[str, Any]:
    """A deliberately simple first-site example, not a rule for all sites."""
    report = records["reports"][0]
    return {
        "site_id": "pine-ridge",
        "title": "Pine Ridge shift briefing",
        "snapshot": snapshot,
        "summary": "Review the site crew's latest recorded gate check before assigning field work.",
        "evidence": [{"id": report["id"], "label": report["note"], "source": report["source"],
                      "observed_at": report["observed_at"], "available_at": report["available_at"]}],
        "weather": {"mode": weather_mode, "record": records["weather"][0] if weather_mode != "unavailable" else None},
        "limitations": "Fictional demonstration site. The gate report does not establish current conditions. Weather is optional context.",
    }


def reserve_briefing(site: dict[str, Any], snapshot: dict[str, Any],
                     feeds: dict[str, Any], context: dict[str, Any], weather_mode: str) -> dict[str, Any]:
    """Compose a compact, persistable briefing from site data and reusable rules."""
    as_of = snapshot["as_of"]
    routes = route_briefings(feeds["reports"], context, as_of)
    sensors = sensor_briefings(feeds["sensors"], context["point_sensors"], as_of)
    assessments = assessment_briefings(feeds["assessments"], context, as_of)
    weather = weather_context(feeds["weather"], weather_mode, as_of)
    plans = active_plans(context, as_of)
    target_names = {r["target_id"]: r["name"] for r in assessments}
    attention = []
    evidence = []

    for route in routes:
        report = route["report"]
        if route["state"] == "reported_blocked":
            attention.append({
                "id": "access-" + route["id"], "priority": 1,
                "title": route["name"] + ": blockage reported",
                "detail": "No later explicit reopening report was available at this cutoff.",
                "action": "Confirm " + route["name"] + " access before assigning field checks.",
                "evidence_ids": [report["id"]] + [r["id"] for r in route["unverified_reports"]],
            })
        elif route["state"] in {"unknown", "unverified"}:
            attention.append({
                "id": "access-" + route["id"], "priority": 1,
                "title": route["name"] + ": access not established",
                "detail": "There is no explicit passable or blocked report available for this route.",
                "action": "Obtain a route-specific check before assigning field work.",
                "evidence_ids": [r["id"] for r in route["unverified_reports"]],
            })
        for item in ([report] if report else []) + route["unverified_reports"]:
            evidence.append({
                "id": item["id"], "label": route["name"] + ": " + item["note"],
                "source": "Fictional field report / " + item["observer_role"],
                "observed_at": item["observed_at"], "available_at": item["available_at"],
                "status": item["status"],
            })

    for sensor in sensors:
        latest = sensor["latest"]
        if sensor["state"] in {"missing", "stale", "needs_review"}:
            detail = ("Latest quality-good observation is " + str(int(sensor["age_minutes"])) + " minutes old."
                      if latest else "No usable observation was available at this cutoff.")
            if sensor["state"] == "needs_review":
                detail = "The newest packet is flagged; the last quality-good value is shown separately."
            attention.append({
                "id": "sensor-" + sensor["id"], "priority": 2,
                "title": sensor["name"] + ": telemetry needs verification",
                "detail": detail, "action": "Check " + sensor["id"] + " telemetry and local conditions.",
                "evidence_ids": [latest["id"]] if latest else [],
            })
        if sensor["flagged_count"] or sensor["missing_samples_between_observations"]:
            attention.append({
                "id": "quality-" + sensor["id"], "priority": 3,
                "title": sensor["name"] + ": incomplete or flagged history",
                "detail": (str(sensor["flagged_count"]) + " flagged packet(s); "
                           + str(sensor["missing_samples_between_observations"]) + " missing scheduled samples between observations."),
                "action": "Review the data gap or flagged readings before relying on this shift's trend.",
                "evidence_ids": [r["id"] for r in sensor["flagged_examples"]],
            })
        if latest:
            evidence.append({
                "id": latest["id"], "label": sensor["name"] + ": " + str(latest["temperature_c"]) + " °C at the sensor.",
                "source": sensor["source"], "observed_at": latest["observed_at"],
                "available_at": latest["available_at"], "status": sensor["state"],
            })

    for item in assessments:
        if item["record"]:
            record = item["record"]
            label = str(item["value"]) + "% exercise footprint overlap" if item["value"] is not None else "assessment value missing"
            evidence.append({
                "id": record["assessment_id"], "label": item["name"] + ": " + label + ".",
                "source": "Fictional packaged assessment / " + record["model"],
                "observed_at": record["assessed_at"], "available_at": record["available_at"],
                "status": item["state"],
            })

    blocked = [r["name"] for r in routes if r["state"] == "reported_blocked"]
    unknown = [r["name"] for r in routes if r["state"] in {"unknown", "unverified"}]
    if blocked:
        summary = ", ".join(blocked) + " was reported blocked. Confirm access before assigning field checks."
    elif unknown:
        summary = "Access is not established for " + ", ".join(unknown) + ". Obtain a route-specific check."
    else:
        summary = "Required routes were reported passable at their observation times. Reconfirm access and asset status before field work."
    attention.sort(key=lambda item: (item["priority"], item["id"]))
    if not attention:
        attention.append({
            "id": "verify-plan", "priority": 3, "title": "Complete the reserve's required checks",
            "detail": "Recent readings and historical access reports do not confirm relay or intake readiness.",
            "action": "Confirm relay and intake status, then brief crews on verified access.",
            "evidence_ids": [r["report"]["id"] for r in routes if r["report"]],
        })
    return {
        "schema_version": 1, "site_id": site["id"], "title": site["name"] + " briefing",
        "snapshot": dict(snapshot), "summary": summary, "attention": attention,
        "routes": routes, "sensors": sensors, "assessments": assessments,
        "plans": [{**p, "target_name": target_names.get(p["target_id"], p["target_id"])} for p in plans],
        "evidence": evidence, "weather": weather,
        "suggested_note": "Next shift:\n" + "\n".join("- " + item["action"] for item in attention),
        "rules": {
            "availability": "Only observations available at or before the scenario cutoff are included.",
            "sensor_freshness": "Stale after three nominal sampling intervals (15 minutes here); a demonstration data-quality rule, not a hazard threshold.",
            "weather_freshness": "Airport observations older than 90 minutes are stale; this is an explicit demonstration rule.",
            "route_resolution": "Latest explicit report by observation time; unverified reports cannot establish reopening. All reports still need operational verification.",
            "assessment": "Packaged fictional footprint overlap, not damage probability or a fire-arrival model. Zero is distinct from no assessment.",
        },
        "limitations": "Tabletop exercise. Sensors, reports and assessments are simulated or fictional. Point readings do not establish reserve-wide conditions. No fire-arrival or damage prediction is made. The final historical perimeter is excluded.",
    }
