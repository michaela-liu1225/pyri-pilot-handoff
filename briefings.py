"""Existing product logic. Add the Upper Alder workflow here or refactor it."""

from typing import Any


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


def upper_alder_briefing(snapshot: dict[str, Any], weather_mode: str) -> dict[str, Any] | None:
    """YOUR TASK: build a useful briefing from the supplied evidence.

    Raw site context: GET /api/sites/upper-alder/context
    Replayable feeds: GET /api/sites/upper-alder/feeds/{reports|assessments|weather}
    The endpoint returns 501 until this function returns a dict. You can change
    this architecture and UI, but preserve the first site's working journey.
    """
    return None
