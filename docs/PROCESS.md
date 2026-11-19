# Process, timebox and AI use

## Time record

- First retained clock reading: **17 November 2026, 16:46:30 UTC**.
- Initial documentation checkpoint: **18:08:49 UTC**, after 82.3 minutes of observed wall time.
- Requested browser-review follow-up began at the retained **18:18:10 UTC** reading.
- Follow-up documentation checkpoint: **18:49:27 UTC**, **123.0 minutes** after the first retained reading.
- The initial reading preceded that clock. Final repository closeout, the later candidate-led evidence check, local deployment recovery and presentation preparation are included in the declared total rather than being omitted as post-build work.
- **Candidate-reported total assessment work: approximately 3 hours 25 minutes**, including manual verification and presentation preparation. This is the candidate's final estimate, not a duration independently measured by Codex. The first retained clock reading above remains the original reference point; the work included follow-up sessions, so adding the total to that timestamp would not establish a continuous-session finish time. Commit timestamps are checkpoints rather than measurements of phase effort.

This accounting includes reading/planning, implementation, source inspection, dependencies, authentication attempts, the computer restart, waiting between work, deployment, tests, screenshots, documentation and presentation preparation. The browser follow-up does not reset the original timebox. The presentation call itself takes place separately.

## AI assistance and checking

I discussed the options with Codex and made the final decisions on scope, source selection and implementation trade-offs. I chose a focused access-and-telemetry handoff using point sensors and field reports, with assessments and optional weather as context. Satellite layers were deferred after comparing their availability, spatial support and usefulness for this shift.

Codex assisted with pack and source inspection, implementation, test generation and execution, Git preparation, deployment, browser checks and documentation. It also suggested review steps, expected outcomes and example handoff wording. I used the original records and the running application to review the consequential results, personally exercised the workflows below, and ran the Python test suite. The nine starter tests were retained; candidate-added tests assert fixed source-record expectations, and API tests cover saved evidence through failure/recovery and restart.

One assumption investigated was whether the latest observation in the archive could represent evidence available to the duty lead. A separate raw JSON/CSV inspection, using only the Python standard library, disproved that shortcut:

- FR-05 describes reopening at 23:40 UTC but arrives at 00:20, after the 00:00 handoff.
- NODE-03-089 is the latest delivered good packet at that cutoff: observed 23:25, available 23:26, therefore 35 minutes old.
- NODE-01-063 and NODE-01-064 contain 87 °C with quality `suspect`; treating them as reliable air-temperature evidence would discard the supplied quality flag.

The application therefore filters availability before interpreting records, retains unverified route reports, and separates flagged readings from reliable values. Codex performed the separate raw-data calculation without importing application functions. This provides a calculation independent of the application implementation; the manual review below records my own checking.

## Manual review

I performed manual verification on 17 November 2026, the original work day. This section supplements the earlier documentation with my account of that review.

- **Route evidence:** I inspected FR-03, FR-04 and FR-05 in the raw JSON and compared them with the afternoon briefing. FR-03 reports a blockage; FR-04 did not inspect the spur; FR-05 arrived at 00:20, after the 00:00 cutoff. I confirmed that the UI retains the blockage report and labels FR-04 unverified. This rejects the assumption that the latest observation in the archive was necessarily available to the duty lead.
- **Sensor evidence:** I inspected NODE-03-089 in the CSV and compared its 23:25 observation, 23:26 delivery and 28.6 C reading with the UI. At 00:00 the observation is 35 minutes old, exceeding the disclosed 15-minute freshness rule. I confirmed the displayed packet ID, age and stale label. The 25-minute trend interval is a different quantity from the 35-minute observation age.
- **Saved handoff:** I saved and reopened an Upper Alder note, checked the read-only state, and verified that the saved note could still be reopened after a page refresh.
- **Failure and recovery:** I saved a handoff with unavailable weather, restored normal weather and confirmed that reopening the saved handoff retained its original unavailable-weather evidence.
- **Existing site:** I loaded Pine Ridge, saved a note and reopened it successfully.
- **Tests:** I personally ran `python -m unittest discover -s tests -v` using the prepared Python environment and confirmed the final result: 22 tests, OK.

These are focused manual checks of the supplied exercise and AI-assisted implementation. Application-process restart checks and automated browser regressions were executed with Codex; I do not claim to have personally rerun those steps. No scientific validation or independent user study is claimed.

The browser review also challenged the green DOM suite with screenshots and viewport bounds. A new regression first failed because mobile save feedback was outside the viewport, then passed after the scroll/history fix. This checks an observed failure rather than assuming that rendered DOM content must be visible.

## Scope and unfinished work

No external dataset or new scientific model was added. Satellite alternatives were compared against the prepared catalog and provenance, then deferred in favor of point-sensor quality and route-specific evidence. Existing maps, source attributions, Pine Ridge and storage were preserved.

The initial connected-browser limitation was resolved in the follow-up using an isolated Playwright-managed Chromium instance. Real layout, Leaflet interactions, save/reopen, keyboard actions and recovery were checked and documented with screenshots. A full accessibility audit, real-phone/cross-browser checks, a human usability trial and backup recording remain unfinished. Docker was unavailable, so the supplied Python deployment route was exercised instead. The temporary HTTPS demo requires its host/processes to stay online and is not a production service.

The next commercial milestone and third-site adapter work are described in [README.md](../README.md). Observed checks are in [VERIFICATION.md](VERIFICATION.md).
