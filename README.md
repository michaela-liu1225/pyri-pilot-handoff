# Upper Alder: evidence-led shift handoff

Upper Alder now has a usable briefing and persistent handoff alongside the existing Pine Ridge journey. The duty lead sees reported access constraints, the age and quality of local sensor evidence, and checks to carry into the next shift. The supplied reserve map stays in place.

- [Live assessment demo](https://connectivity-yea-stick-join.trycloudflare.com) — username `reviewer`; password shared privately. The temporary URL requires the host computer, app and tunnel to remain running.
- [Source repository](https://github.com/michaela-liu1225/pyri-pilot-handoff) — private; reviewers need access or a source archive.
- [10-minute review guide](docs/REVIEW_GUIDE.md), [verification record](docs/VERIFICATION.md), [time and AI process](docs/PROCESS.md).

This is a historical tabletop exercise. The reserve, sensors, reports and assessments are fictional or simulated. The application does not predict fire arrival, damage, or safe access.

## Try the changed journey

1. Select **Upper Alder → Afternoon handoff**. Intake Spur's blockage report needs attention; a later unverified view of the main road does not establish reopening of the spur.
2. Inspect **Local sensor evidence**. NODE-03 is 35 minutes old; NODE-02 has 11 missing samples; NODE-01's two flagged 87 °C readings are excluded from reliable readings and trends.
3. Open the assessment details: Meadow Yard's **0%** differs from North Cache's **Not assessed**. Percentages describe a fictional footprint, not damage probability.
4. Write a note or explicitly **Add suggested checks**, then save. Reopen the handoff: the original evidence and note are read only, with the historical cutoff and actual save time shown separately.
5. Return to replay. Switch weather to **Unavailable fixture**, **Stale fixture**, then **Normal**. Core evidence and the unsaved draft survive; previously saved evidence remains unchanged. Switch to Pine Ridge to check compatibility.

| Cutoff | UTC | Scenario local time |
| --- | --- | --- |
| Morning briefing | 2021-08-30 18:00 | Aug 30, 11:00 PDT |
| Afternoon handoff | 2021-08-31 00:00 | Aug 30, 17:00 PDT |

The interface displays UTC explicitly. Evidence must have been **available** by the cutoff; an earlier observation alone is insufficient. Stale means older than three nominal sensor intervals (15 minutes here), or 90 minutes for airport weather. These are disclosed demo quality rules, not hazard thresholds.

## What changed and where

The starter already supplied FastAPI, raw feeds, site/context configuration, the Leaflet map and local assets, shared demo login, validated handoff endpoints, SQLite storage, weather controls and Pine Ridge. Upper Alder's briefing returned HTTP 501.

| Contribution | Entry points |
| --- | --- |
| Availability filtering, route resolution, packet quality/deduplication, gaps and freshness | [`evidence.py`](evidence.py): `available_records`, `route_briefings`, `sensor_briefings`, `assessment_briefings`, `weather_context` |
| New reserve briefing, ordered attention and authored-plan links | [`briefings.py`](briefings.py): `reserve_briefing`; dispatch/logging in [`app.py`](app.py) |
| Source disclosures, uncertainty and saved-state display | [`static/briefing.js`](static/briefing.js), [`index.html`](index.html), [`static/styles.css`](static/styles.css) |
| Draft preservation, explicit suggestions, immutable saved views and stale-response protection | [`static/app.js`](static/app.js) |
| Focused evidence/API/DOM checks and CI | [`tests/test_evidence.py`](tests/test_evidence.py), [`tests/test_upper_alder.py`](tests/test_upper_alder.py), [`tests/test_ui.mjs`](tests/test_ui.mjs), [workflow](.github/workflows/verify.yml) |

The supplied `static/map.js`, data and storage implementation are retained. No new map engine or risk model was introduced. Source records remain packaged locally; no external dataset was added. Original attribution and provenance remain in [SOURCE_CATALOG.md](SOURCE_CATALOG.md), [CALDOR_DATA.md](CALDOR_DATA.md) and `data/`.

## Source choices and trade-offs

| Source | Choice and reason |
| --- | --- |
| Simulated point sensors | **Implemented.** Five-minute point readings, normally one-minute delivery, directly expose telemetry age and quality for this shift. Only three local points; gaps, duplicates, suspect spikes and late packets prevent any reserve-wide claim. |
| Fictional field reports | **Implemented.** Route-specific reports directly constrain the authored intake/access checks. Observation, delivery, role and unverified scope remain visible. A reported status still needs operational verification. |
| Fictional overlap assessment | **Implemented as secondary context.** Preserve the supplied four values and explicit missingness; do not turn them into a risk score. |
| Archived airport weather | **Optional context with stale/unavailable/recovery states.** Station measurements have an assumed ten-minute delivery lag; they do not describe the whole reserve. |
| Sentinel-2 optical samples | **Deferred.** Native 10 m reflectance / 20 m classification, but the supplied extract is sparse samples about 385 × 396 m apart, not complete imagery. The Aug 29 scene becomes available only at Aug 30 18:39:19 under the assumed +24-hour lag. Useful vegetation context, less direct than access/telemetry for this handoff; cloud/smoke and sampling limit interpretation. |
| Landsat-8 thermal samples | **Deferred.** Native 100 m thermal data on a 30 m product grid; supplied Aug 5/21 scenes and assumed +7-day availability make this older context. Land-surface temperature cannot be substituted for point air temperature. |
| Simulated VIIRS-like detections | **Deferred.** Four coarse 375 m anomaly points with a 55-minute lag; insufficient to establish route passability, a perimeter or arrival time. These are not NASA observations. |

Static terrain and locations remain map context and are not counted as the two implemented evidence sources. The retrospective final fire perimeter is excluded from the briefing. Alerts, satellite overlays, a forecast model and multi-user workflows were deferred to keep the release focused on a saved, explainable handoff.

## Run, test and deploy

Python 3.11+; verified locally with Python 3.13.9 and in CI with Python 3.12. No frontend build is required.

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. This development command has no login by default; keep it on loopback. For Windows, activation and equivalent commands are in [the original README](https://github.com/michaela-liu1225/pyri-pilot-handoff/blob/starter-v1.2/README.md).

Optional DOM tests require Node 20+ (CI uses 22). With the Python environment active:

```sh
npm ci --ignore-scripts --no-fund --no-audit
npm run test:ui
```

The suite contains **21 Python tests** (all 9 supplied tests retained) and **5 DOM workflow tests**. The latter exercise the actual controller/renderer with transport and the supplied map stubbed; they do not constitute visual browser QA. See [verification](docs/VERIFICATION.md) for the live service restart and HTTPS checks.

For a protected demo, stop the development server first:

```sh
python scripts/setup_demo.py
python scripts/serve_demo.py
# In a second terminal with cloudflared installed:
cloudflared tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:8000
```

Setup prints a new private password and writes only its hash to ignored `.env`; keep the password out of Git. Handoffs live in ignored `runtime/handoffs.sqlite3`. Both processes must stay running. `/healthz` checks app/storage; logs include site, cutoff ID and weather state. Detailed restart, storage and Docker alternatives: [DEPLOYMENT.md](DEPLOYMENT.md). The delivered instance uses the Python route and cloudflared 2026.11.1 over HTTP/2.

## Review history and limits

`starter-v1.2` preserves the exact starter; changes are separated into evidence, briefing/API, UI, CI, a provenance fix, and documentation commits. The original instructions are preserved at [the starter tag](https://github.com/michaela-liu1225/pyri-pilot-handoff/tree/starter-v1.2) and verbatim in [docs/STARTER_README.md](docs/STARTER_README.md). Relative links in that verbatim copy refer to the original repository root. `MANIFEST.sha256` describes the starter tag, not the modified release.

```sh
git log --reverse --oneline starter-v1.2..main
git diff --stat starter-v1.2..main
```

Known limits: browser visual/accessibility checks and a screen recording remain unfinished because the connected browser could not be controlled. Drafts survive in-app changes, not a page reload. The map is static site context when viewing a saved handoff. Shared login, client-supplied evidence snapshots, single-instance SQLite, no tenant authorization or backup/restore automation, and a temporary tunnel make this an assessment demo. There is no tamper-proof audit guarantee or production uptime commitment.

## Next paid-pilot milestone

Run a supervised duty-lead trial using agreed source/verification rules and a supported hosted instance with named access, backup/restore and basic availability monitoring. Measure **time to complete a correct handoff without omitting predefined access/telemetry checks**, plus omissions and misunderstood evidence. No improvement has yet been measured. This milestone tests usefulness and supportability before adding sales-driven map layers or alerts.

For a third site, add its registry, geometry, route/asset plans and feed adapters, then reuse the evidence functions and generic reserve composer with fixture-based acceptance checks. The current HTTP loader still explicitly binds Upper Alder feeds/context; it must become a per-site registry. Full plug-and-play onboarding is not claimed. [Process notes](docs/PROCESS.md) record elapsed time and the independent raw-data check of AI-assisted work.
