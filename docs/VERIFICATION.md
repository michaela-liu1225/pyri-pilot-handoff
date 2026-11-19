# Verification record

## Automated checks

- **22 Python tests passed:** all 9 starter tests plus 9 evidence-rule and 4 Upper Alder API tests.
- **5 DOM workflow tests passed:** rendering/provenance, draft and saved-state handling, opening a saved handoff after briefing failure, ignoring an obsolete response, and accurate feedback when saving succeeds but history reload fails.
- **6 real-browser tests passed:** responsive layout/map controls, saved-state/draft/weather flows, save/history failures, in-flight editing protection, mobile/tablet controls, and obsolete history response handling. See [BROWSER_QA.md](BROWSER_QA.md).
- GitHub Actions repeats all three suites on pushes and pull requests with pinned action commits, Python 3.12 and Node 22. [Initial successful run](https://github.com/michaela-liu1225/pyri-pilot-handoff/actions/runs/44143263111) validated commit `9e2fb17`; use the [Actions tab](https://github.com/michaela-liu1225/pyri-pilot-handoff/actions) for the current release result.
- Local execution used Python 3.13.9 and Node 20.17.0. Browser follow-up used Playwright 1.65.1 and Chromium 159.0.8154.6, with screenshot review of the deployed HTTPS instance.

## Consequential expected outcomes

| Raw evidence / uncertainty | Expected result and check |
| --- | --- |
| FR-05 observed before handoff but delivered at 00:20 | Excluded at 00:00; retained only once available. `test_late_reopening_is_excluded_until_delivery` |
| FR-04 did not inspect the spur | Does not clear FR-03's explicit blockage. The report remains visible and labelled unverified. |
| NODE-03 packets delivered late | Latest usable packet is NODE-03-089: 23:25 observation, 23:26 delivery, 35 minutes old at 00:00. `test_sensor_cutoff_uses_delivery_not_observation` |
| NODE-01 two suspect 87 °C packets, duplicate delivery | Suspect packets excluded from reliable readings/trend; duplicate removed; conflicts are quarantined. Two focused quality/conflict tests. |
| NODE-02 missing samples | Eleven missing five-minute samples between 20:10 and 21:10 remain visible; no interpolation claim. |
| Meadow Yard zero; North Cache absent | Display 0% versus Not assessed. `test_zero_assessment_is_distinct_from_absence` plus DOM assertions. |
| Optional weather unavailable/stale/recovered | Preserve core evidence and allow saving while unavailable. Preserve original saved weather after recovery and restart. |
| Browser request finishes after user changes site | Discard obsolete response; retain the current site's briefing/map. DOM test. |

The raw-fixture cross-check used Python's `csv`, `json` and `datetime` only, with no imports from `app`, `briefings` or `evidence`. Values above were checked directly against source rows and asserted as fixed expectations, rather than taking the tested function's output as the expected answer. The candidate manually compared the consequential report and sensor timestamps with the running afternoon briefing, confirming the blocked route and 35-minute-old NODE-03 reading. This is a focused human check of the AI-assisted result, not scientific validation.

## Candidate manual review

The candidate confirms that manual verification took place on the original work day, 17 November 2026. This section supplements the earlier documentation with the candidate's account.

| Check performed by the candidate | Confirmed result |
| --- | --- |
| Raw FR-03/04/05 compared with the afternoon UI | Matching observation/delivery times; FR-04 labelled unverified; FR-05 arrives after the cutoff. |
| Raw NODE-03-089 compared with the UI | Matching packet ID, 28.6 C, 23:25 observation, 23:26 delivery, 35-minute age and stale state. |
| Save and reopen an Upper Alder handoff | Saved note reopened with read-only controls, including after a page refresh. |
| Weather unavailable, then normal, then reopen | Candidate confirmed the saved handoff retained unavailable weather after recovery. |
| Pine Ridge save/reopen | Candidate confirmed the original site's journey completed successfully. |
| Python suite run in VS Code | Candidate reported 22 tests and OK after personally running the suite. Codex separately reran the same 22 tests successfully. |

The candidate made the final scope and source decisions after discussion with Codex. Codex supplied implementation assistance, review guidance, expected outcomes and example note wording; the candidate performed the manual actions and comparisons above. Application-process restart and automated browser checks were performed with Codex. See [PROCESS.md](PROCESS.md) for the full allocation of work.

## Running service, 17 November 2026 UTC

At **18:01:48**, HTTP checks on the actual local process verified:

- `/healthz` returns 200 without credentials; the page and API return 401 without login.
- Authenticated HTML and changed static assets load; both replay cutoffs return their expected evidence.
- Weather's raw unavailable endpoint returns 503 while the briefing remains available; stale and normal modes produce the intended states.
- Three example handoffs were created through HTTP, including a new-site handoff with unavailable weather and an existing-site handoff.
- The Uvicorn process was stopped and replaced. The same SQLite database restored all three complete documents without changes. A handoff requested under the other site returns 404; this is site scoping, not user/tenant authorization.

At **18:03:27**, the temporary HTTPS endpoint was checked separately: public health 200, protected page 401, authenticated page/local libraries/fonts 200, map context 200, weather failure/recovery, and reopening the persisted handoffs. The tunnel negotiated HTTP/2. At **18:07:51**, a new handoff was also created and reopened through HTTPS, with its full evidence snapshot compared unchanged. These were real HTTP requests, not mocked browser fetches.

Private runtime logs and machine-readable check results remain under ignored `runtime/`. They contain no committed passwords or database files. The app emits `briefing_ready` records including site, snapshot ID, weather state and evidence count. `/healthz` reports the supplied API version 1.2; the starter baseline remains identifiable by the `starter-v1.2` tag.

## Coverage boundaries

The initial release had only DOM/HTTP checks. The requested follow-up completed real Chromium layout and interaction checks against the HTTPS demo, with [reviewed screenshots and regression details](BROWSER_QA.md). DOM checks remain a narrower layer; full screen-reader, cross-browser and human-usability validation is not claimed. Browser-created saved evidence was also compared unchanged after an actual application-process restart.

Docker was not available and its unchanged alternative deployment path was not exercised. There is no production load test, malicious-client audit, customer outcome measurement or claim that simulated evidence validates real-world fire decisions.
