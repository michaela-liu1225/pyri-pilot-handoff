# Ten-minute presentation and live demo

Use the deployed app and repository; no slide deck is needed. Share the demo password privately and provide reviewers repository access or a source ZIP before the call. Recheck the temporary URL shortly before presenting.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–1:00 | Upper Alder, morning briefing, supplied map | The duty lead needs an understandable shift decision and handoff. The map, feeds, persistence and Pine Ridge were supplied; the reserve briefing is new. |
| 1:00–3:00 | Switch to afternoon; expand Intake Spur and NODE-03 | Blockage was reported; FR-04 did not inspect the spur. NODE-03's last delivered good reading is 35 minutes old. Local evidence and delivery delay set limits on what can be trusted. |
| 3:00–4:00 | NODE-01/02 details, assessment table and authored steps | Two suspect 87 °C readings are excluded, 11 samples are missing elsewhere, and 0% differs from no assessment. Task duration is not time until fire arrival. |
| 4:00–5:30 | Use Write handoff; add a note, save, reopen | Distinguish the 2021 scenario cutoff from today's save timestamp. Saved evidence is read only and survives restart. Operators explicitly choose whether to add suggested checks. |
| 5:30–6:30 | Return to replay; weather Unavailable → Stale → Normal | The core briefing and draft remain. Reopen the failure example: its original unavailable-weather state stays unchanged after recovery. |
| 6:30–7:15 | Pine Ridge briefing and saved example | Existing first-site journey still works. The source map and storage were retained. |
| 7:15–8:30 | Raw FR-03/04/05, evidence.py, focused test and CI | Trace the consequential claim below. Explain the independent raw-fixture check and AI disclosure honestly. |
| 8:30–10:00 | README source decisions and next milestone | Compare sparse satellite context with local sensors. Discuss a supervised customer trial, measurable omissions/time, named access, storage recovery and support. |

## One claim, end to end

**Displayed claim:** Intake Spur was reported blocked at afternoon handoff; confirm access before assigning field checks.

1. In [`field_reports.json`](../data/caldor/field_reports.json), FR-03 reports blockage at 21:35 UTC and arrives 21:50. FR-04 arrives 22:50 but only describes an unverified view of the main road. FR-05 describes reopening at 23:40 but arrives **00:20 the next day**, twenty minutes after the handoff cutoff.
2. [`available_records`](../evidence.py) enforces delivery by the cutoff. `route_briefings` uses the latest explicit route report and retains later unverified evidence without promoting it to passable. It joins the route to active response plans.
3. [`reserve_briefing`](../briefings.py) puts this access constraint first and carries source IDs into the saved snapshot. [`renderRoutes`](../static/briefing.js) exposes both FR-03 and FR-04.
4. `EvidenceRules.test_late_reopening_is_excluded_until_delivery` in [`test_evidence.py`](../tests/test_evidence.py) checks blockage at 00:00 and reopening only at 00:20. API and DOM checks verify the displayed result.

**Independent cross-check:** read the raw JSON and sensor CSV using only standard-library parsing, without importing application logic. FR-05's delivery is later than the cutoff. NODE-03-089 is observed at 23:25, delivered at 23:26, so it is 35 minutes old at 00:00. This rejected an observation-only interpretation that would incorrectly show a reopened route and fresher telemetry. Codex performed this separate check; do not claim it was independent human validation.

## Saved examples on the delivered instance

| Example | Handoff ID | What it demonstrates |
| --- | --- | --- |
| Upper Alder afternoon | `88cfbed91d17` | Blockage and sensor verification note with normal weather |
| Upper Alder weather failure | `5ba2771ca8d9` | Evidence saved while weather was unavailable |
| Pine Ridge | `01fc052496fc` | Existing-site compatibility |

The browser-reviewed patch also includes Upper Alder example `615210cc77e8`. These IDs refer to the running local SQLite instance, not fixture data committed to Git. The service was actually stopped and restarted; all three full saved documents compared equal after restart. Create your own short handoff during the presentation.

## Prepare for discussion

- **“Add alerts first.”** Agree the trigger, delivery expectations, acknowledgements and escalation ownership before automating; current data quality flags are not validated hazard alerts.
- **“Add a third site next week.”** Move feed/context binding into a per-site registry; supply the new geometry, plans, adapters and acceptance cases. Reuse the rule layer, but validate site-specific cadence and access semantics.
- **“The customer needs offline operation.”** Local fixtures and map assets already avoid upstream calls, but this browser workflow still needs its server. Offline sync, durable drafts and conflict resolution are separate work.
- **“Can this support paying users today?”** Demonstrate the prototype, then describe the supervised pilot milestone. Shared credentials, client-submitted snapshots and a laptop tunnel need stronger identity, audit controls and reliable hosting before an operational rollout.

The automated and HTTP checks are recorded in [VERIFICATION.md](VERIFICATION.md). Chromium visual and interaction checks are complete in [BROWSER_QA.md](BROWSER_QA.md); a human usability study, full accessibility audit and backup recording are not claimed complete. If the temporary URL expires, follow [DEPLOYMENT.md](../DEPLOYMENT.md), retain `runtime/handoffs.sqlite3`, and share the new URL privately with the reviewers.
