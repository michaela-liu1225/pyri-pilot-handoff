# Browser verification and follow-up fixes

Verified on 17 November 2026 using **Playwright 1.65.1 / Chromium 159.0.8154.6**. A headed browser exercised the deployed HTTPS demo; separate repeatable tests launch real headless Chromium against a fresh authenticated FastAPI process and temporary SQLite database. The existing shared Chrome session was not needed.

## Findings and separate commits

| Finding | Change | Commit |
| --- | --- | --- |
| Saving at the bottom left feedback offscreen at the top; reopening a handoff left its cutoff/readonly context offscreen | Put save/error/progress feedback beside the action, add Write handoff / Review briefing navigation, focus the saved briefing, and show note previews in history | `0cc5e21` |
| Two suggested sensor checks were indistinguishable | Include NODE-01 / NODE-02 in their respective suggested actions | `c74f67c` |
| The 1280 × 800 desktop shell exceeded the viewport and clipped the footer/status | Size the workspace from the remaining viewport height | `fd1d88c` |
| A late history response could replace a newer list; mobile scroll anchoring moved save feedback offscreen | Ignore obsolete history responses, stabilize scrolling, and reveal feedback after list completion | `3d8930f` |
| The tablet's initial screen showed only map/context, hiding the briefing and its action | Use the same briefing-first order as mobile | `33dd742` |
| A failed or loading briefing retained the previous source-record count | Clear the count with the evidence list | `c1e9c30` |

Real-browser regression coverage and Chromium installation in CI were added in `aaa53ff` and extended alongside fixes. No Git history was squashed.

## Coverage and observed results

| Surface / state | Check and result | Screenshot |
| --- | --- | --- |
| Desktop: 1440 × 900, 1280 × 800, 1024 × 768 | Header, filters, map, status and footer fit the viewport; evidence panes scroll independently. No horizontal page overflow. | [Briefing](screenshots/desktop-briefing.png) |
| Tablet 768 × 1024; phones 390 × 844 and 375 × 812 | Briefing and Write handoff are visible at startup. Forms, source text and saved rows wrap; scrolling is vertical and intentional. | [Tablet](screenshots/tablet-briefing.png), [mobile save](screenshots/mobile-handoff.png) |
| Supplied Leaflet map | Actual boundary/assets/sensor markers render. Pan, zoom in/out, Fit reserve, Fit all, all three layer toggles off/on and all eight location buttons/popup types exercised. | [Map in the briefing](screenshots/desktop-briefing.png) |
| Evidence details | Both route reports, all three sensors, gaps/flagged values, assessment, response steps, source records and interpretation rules opened and inspected. FR-04 remains unverified; 0% differs from Not assessed. | [Sensor quality](screenshots/sensor-quality.png) |
| Weather and draft | Normal → Unavailable → Stale → Normal changes the visible state/source/time while retaining the note and core evidence. A mobile handoff was saved with unavailable weather. | [Unavailable state](screenshots/weather-unavailable.png) |
| Save → page reload → reopen | Actual HTTPS browser clicks save a note/evidence snapshot. Reopening restores the saved cutoff/weather/note, disables editing and shows both clocks. | [Saved briefing](screenshots/saved-briefing.png) |
| Actual process restart | Browser-created handoff `a43d4f0e1a79` was read back after stopping/replacing Uvicorn; its entire saved JSON document was unchanged. | Saved-state checks recorded below |
| Keyboard | Tab reaches the actions with a visible focus indicator; Enter saves a mobile note. Enter toggles a native evidence disclosure. | [Mobile workflow](screenshots/mobile-handoff.png) |
| Failure and recovery | Injected HTTP 503 on save retains the draft and permits retry. Injected history failure after HTTP 201 reports that the save succeeded. Feedback stays in view. | Automated regressions plus inspected browser captures |
| Slow/older history | Hold an older GET response, save a newer note, then release the old success or failure. The new row and its feedback remain; obsolete errors are ignored. | Regression test 6 |
| Exploratory inputs | Rapid site/cutoff changes finish on the requested Upper Alder morning state; 2,000-character notes remain unchanged if suggestions would exceed the limit; notes cannot change during an in-flight save. | Automated and interactive checks |
| Pine Ridge | Browser save and reopen succeeded; its supplied no-geometry message is explicit and the briefing remains usable. | Browser-created handoff `31d2b5a584b0` |

The mobile history defect was reproduced in a new test **before** the fix: the feedback was at y = −345.9 px, outside the viewport. The same test passes after the change. The final deployed mobile check placed feedback beside the Save button, with no horizontal overflow.

The final Upper Alder presentation example is **`615210cc77e8`**. Older handoffs intentionally retain their originally saved wording and evidence. Test/example notes are clearly identifiable in the local demo database; they are not fixtures committed to Git.

## Reproduce

Activate the Python environment and install dependencies as in the root README, then:

```sh
npm ci --ignore-scripts --no-fund --no-audit
npx playwright install chromium
npm run test:ui
npm run test:browser
```

Linux CI uses `npx playwright install --with-deps chromium`. `test:browser` creates and removes its own server/database and random login; it does not require the shared demo password or mutate the demo database. Set `PYTHON` to an interpreter path if the intended environment is not active.

There are **22 Python, 5 DOM and 6 real-browser test cases (33 total)**. The browser cases cover multiple viewport/state combinations. [Successful browser follow-up CI](https://github.com/michaela-liu1225/pyri-pilot-handoff/actions/runs/44151077343) verified the responsive and race fixes; the [Actions tab](https://github.com/michaela-liu1225/pyri-pilot-handoff/actions) contains the final documentation/release run.

## Visual review boundaries

The reviewed states have no unintended clipping, overlapping controls or horizontal overflow at the listed sizes. Text, source times, quality states, readonly controls and success/error feedback were inspected in their relevant states. Normal browsing produced no unexpected script or console errors; injected HTTP failures intentionally produce network errors.

This verifies Chromium with desktop and emulated mobile/tablet viewports. It is not a Safari/Firefox, real-phone, screen-reader, scientific-validity or human-usability certification. A screen recording and Docker validation remain outside the completed checks. The shared demo app and tunnel remain running; isolated test browser sessions are closed after review.
