# Process, timebox and AI use

## Time record

- First retained clock reading: **17 November 2026, 16:46:30 UTC**.
- Initial documentation checkpoint: **18:08:49 UTC**, after 82.3 minutes of observed wall time.
- Requested browser-review follow-up began at the retained **18:18:10 UTC** reading.
- Follow-up documentation checkpoint: **18:49:27 UTC**, **123.0 minutes** after the first retained reading.
- Initial reading preceded that clock. A conservative **10-minute allowance is an estimate**, not a separate measurement. Including that allowance, elapsed work through this checkpoint is approximately **2 hours 15 minutes**, rounded upward to five minutes. The final push and CI closeout follow this checkpoint and remain within the four-hour cap.

This accounting includes reading/planning, implementation, source inspection, dependencies, authentication attempts, the computer restart, waiting between work, deployment, tests, screenshots, documentation and presentation preparation. The browser follow-up does not reset the original timebox. The presentation call itself takes place separately.

## AI assistance and checking

Codex assisted with inspecting the supplied pack, choosing scope, implementation, tests, Git commits, deployment and these documents. The nine starter tests were retained. Tests of the new rules assert specific supplied records and expected values; API tests additionally verify the immutable saved result through failure/recovery and restart.

One assumption investigated was whether the latest observation in the archive could represent evidence available to the duty lead. A separate raw JSON/CSV inspection, using only the Python standard library, disproved that shortcut:

- FR-05 describes reopening at 23:40 UTC but arrives at 00:20, after the 00:00 handoff.
- NODE-03-089 is the latest delivered good packet at that cutoff: observed 23:25, available 23:26, therefore 35 minutes old.
- NODE-01-063 and NODE-01-064 contain 87 °C with quality `suspect`; treating them as reliable air-temperature evidence would discard the supplied quality flag.

The application therefore filters availability before interpreting records, retains unverified route reports, and separates flagged readings from reliable values. The cross-check did not import application functions. It was still performed with Codex and is not presented as an independent human review, scientific validation or a user study. The presenter should review the trace and run the guide before explaining the work as their own technical contribution.

The browser review also challenged the green DOM suite with screenshots and viewport bounds. A new regression first failed because mobile save feedback was outside the viewport, then passed after the scroll/history fix. This checks an observed failure rather than assuming that rendered DOM content must be visible.

## Scope and unfinished work

No external dataset or new scientific model was added. Satellite alternatives were compared against the prepared catalog and provenance, then deferred in favor of point-sensor quality and route-specific evidence. Existing maps, source attributions, Pine Ridge and storage were preserved.

The initial connected-browser limitation was resolved in the follow-up using an isolated Playwright-managed Chromium instance. Real layout, Leaflet interactions, save/reopen, keyboard actions and recovery were checked and documented with screenshots. A full accessibility audit, real-phone/cross-browser checks, a human usability trial and backup recording remain unfinished. Docker was unavailable, so the supplied Python deployment route was exercised instead. The temporary HTTPS demo requires its host/processes to stay online and is not a production service.

The next commercial milestone and third-site adapter work are described in [README.md](../README.md). A concrete presentation route is in [REVIEW_GUIDE.md](REVIEW_GUIDE.md); observed checks are in [VERIFICATION.md](VERIFICATION.md).
