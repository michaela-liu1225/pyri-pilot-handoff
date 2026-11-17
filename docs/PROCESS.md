# Process, timebox and AI use

## Time record

- First retained clock reading: **17 November 2026, 16:46:30 UTC**.
- Documentation checkpoint: **18:08:48 UTC** on the same day; **82.3 minutes of observed wall time** elapsed.
- Initial reading preceded that retained clock. A conservative **10-minute allowance is an estimate**, not a separately timed measurement.
- Budgeted closeout: about five further minutes for documentation checks, the final push and its CI result. Total estimated work through release: **about 1 hour 35 minutes**, comfortably below the four-hour cap. Authentication attempts, the computer restart, dependency restoration and waiting inside the recorded interval are included, not subtracted.

Commit timestamps are useful checkpoints, not exact phase effort: starter import 17:19, evidence rules 17:25, briefing/API 17:29, UI and DOM checks 17:55, CI 18:00, live restart/HTTPS verification 18:01–18:07. Reading, source inspection, planning, implementation, checks, deployment, documentation and presentation preparation are all within this accounting. The live demonstration and Q&A take place separately.

## AI assistance and checking

Codex assisted with inspecting the supplied pack, choosing scope, implementation, tests, Git commits, deployment and these documents. The nine starter tests were retained. Tests of the new rules assert specific supplied records and expected values; API tests additionally verify the immutable saved result through failure/recovery and restart.

One assumption investigated was whether the latest observation in the archive could represent evidence available to the duty lead. A separate raw JSON/CSV inspection, using only the Python standard library, disproved that shortcut:

- FR-05 describes reopening at 23:40 UTC but arrives at 00:20, after the 00:00 handoff.
- NODE-03-089 is the latest delivered good packet at that cutoff: observed 23:25, available 23:26, therefore 35 minutes old.
- NODE-01-063 and NODE-01-064 contain 87 °C with quality `suspect`; treating them as reliable air-temperature evidence would discard the supplied quality flag.

The application therefore filters availability before interpreting records, retains unverified route reports, and separates flagged readings from reliable values. The cross-check did not import application functions. It was still performed with Codex and is not presented as an independent human review, scientific validation or a user study. The presenter should review the trace and run the guide before explaining the work as their own technical contribution.

## Scope and unfinished work

No external dataset or new scientific model was added. Satellite alternatives were compared against the prepared catalog and provenance, then deferred in favor of point-sensor quality and route-specific evidence. Existing maps, source attributions, Pine Ridge and storage were preserved.

The connected browser could not be controlled. Layout, real Leaflet interactions, accessibility, a human usability trial and a backup recording remain unfinished; DOM and HTTP checks are explicitly narrower. Docker was unavailable, so the supplied Python deployment route was exercised instead. The temporary HTTPS demo requires its host/processes to stay online and is not a production service.

The next commercial milestone and third-site adapter work are described in [README.md](../README.md). A concrete presentation route is in [REVIEW_GUIDE.md](REVIEW_GUIDE.md); observed checks are in [VERIFICATION.md](VERIFICATION.md).
