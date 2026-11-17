# Ship the next pilot site

**Candidate release v1.2 | 3-4 hours | Four-hour cap | AI/agentic tools welcome**

## Start here

Read this README and the short [CUSTOMER.md](CUSTOMER.md), then run the starter. Before implementing your chosen sources, read the **Two evidence cutoffs** and **Failure and recovery controls** sections in [DATA.md](DATA.md), and the relevant entries in [SOURCE_CATALOG.md](SOURCE_CATALOG.md).

Use [DEPLOYMENT.md](DEPLOYMENT.md) when ready to deploy and [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md) when preparing your submission. [MAP.md](MAP.md), [CALDOR_DATA.md](CALDOR_DATA.md) and detailed provenance are reference material to consult as needed; you do not need to read every dataset specification end to end.

## The customer and the task

A pilot customer is adding **Upper Alder Timber Reserve** as a second protected site. An incoming duty lead needs to see what needs attention, what evidence they can trust, what still needs verification, and a useful handoff from the previous shift. Coverage is patchy, reports arrive late, and an optional weather feed can fail.

Extend this existing application to support that journey. **Pine Ridge is the working first site: preserve its briefing and saved-handoff journey.** Upper Alder's site configuration, AOI, evidence feeds and storage plumbing exist; its briefing deliberately returns HTTP 501 until you implement it. The starter uses FastAPI, a small browser UI and SQLite. It is a purpose-built stand-in for working in an existing product, not a production Pyri repository. Keep the supplied backend and working journey; you may refactor or use another frontend approach if useful.

The Caldor Fire is historical context. Both sites, their assets, reports, plans and exercise assessments are fictional. This is a tabletop workflow, not a fire forecast or operational safety system. The timber reserve is the thing to protect; the historical fire is context.

## Supplied map workspace

The starter follows Pyri Platform's central map and side-panel layout, with the reserve boundary, four assets and three sensor locations already mapped. Pan, zoom, fit, context toggles and selection are included. Map libraries, fonts and a coarse terrain reference are bundled locally: no map API key or runtime network dependency is required. See [MAP.md](MAP.md). The map is provided infrastructure; focus your time on the duty lead's evidence and handoff workflow.

## What a complete small submission does

1. **Brief the new site's duty lead.** Show the protected reserve, what needs attention and why, using at least two supplied evidence sources. **At least one must be a satellite or point-sensor feed used in the working result**, not only discussed in the README. The supplied Sentinel-2, Landsat-8, simulated VIIRS-like detections or simulated point-sensor readings qualify. Relate the evidence to the reserve's authored plan or access constraint. Inspect the multi-source catalog and compare at least one satellite source with the point sensors in your scope decision: explain what you used, what you excluded, and why. You may exclude individual sources with a reason, but must implement at least one satellite or point-sensor feed. You need not integrate every layer. Keep the supplied AOI map pane with the reserve boundary, assets and sensor locations. Choose your evidence overlays freely; cards, tables and charts can complement the map. Static map geometry and sensor-location markers alone do not count as the two evidence sources.
2. **Make evidence trustworthy.** Show sources, relevant times and uncertainty. Support the supplied morning and afternoon cutoffs. Filter by `available_at`, not only `observed_at`; distinguish no assessment from a numeric zero and an unverified observation from a confirmed one. Keep the retrospective final perimeter out of decision evidence. Explain any heuristic; no validated fire-arrival or damage model is supplied.
3. **Leave a persistent handoff.** Save the operator's note together with a snapshot of the evidence the user saw. Reopen that saved state after an app restart. The generic handoff API and SQLite persistence are already provided.
4. **Run and recover.** Demonstrate a running deployment, with reproducible steps, a health check and useful logs. Exercise an unavailable or stale optional weather feed and show recovery without losing the core briefing or saved handoff. Preserve the first site. The supplied temporary HTTPS preview is an acceptable assessment deployment; explain its limits for a paying customer. You may use another host, but spending money is not expected.
5. **Show ownership and verify a consequential behavior.** Identify what the starter already did, what you changed, and the files or functions behind that change. Keep the supplied baseline tests passing and add focused tests for a candidate-added core result and a failure/uncertainty case. Trace one important displayed claim through your code to its data and a check you performed. Include at least one independent check of AI output or an assumption you investigated yourself.

The feed controls and persistence plumbing are supplied so you can focus on a useful release. The pack includes real Sentinel-2 optical and Landsat-8 thermal extracts, simulated VIIRS-like detections and five-minute point sensors, plus real hourly/daily weather and terrain. See [SOURCE_CATALOG.md](SOURCE_CATALOG.md) for differences in resolution, cadence, quality and availability; [CUSTOMER.md](CUSTOMER.md) for competing requests; and [DATA.md](DATA.md) for replay rules. You do not need every dataset, a new model, a new map engine, alerts, a multi-tenant system or production-grade infrastructure.

## Optional additional data

You may supplement the supplied materials with relevant, publicly available geospatial data that permits your intended use. **The supplied package is sufficient for a strong submission.** Additional sources are optional and do not automatically improve your score; their usefulness and reliability matter, not their number.

- Discovery, preparation and integration count toward the four-hour cap. No paid services or purchases are expected.
- Supplement the common exercise: retain the fictional reserve, assets, scenario and required use of at least two supplied evidence sources, including a satellite or point-sensor feed.
- Document the source URL or dataset identifier, reuse licence and attribution, observation/validity dates, availability time, retrieval date, resolution or spatial support, significant transformations and limitations. Public accessibility alone does not establish reuse rights.
- Respect the historical replay cutoffs. If historical availability cannot be established, label the uncertainty and either exclude the source from as-of decision evidence or state a defensible exercise assumption. Later-created data may appear as clearly labelled background or retrospective context, not evidence claimed to have been available during the replay. A modern road map does not establish historical access conditions.
- Make the result reproducible: include a small cached extract where licensing permits, or clear retrieval instructions. Keep the core briefing and handoff usable if the external service is unavailable, and disclose any demo dependency or missing evidence.
- Explain which user need the additional data addresses and how you verified that it improves the result. Choosing not to add a source is equally valid.

## Timebox and delivery

Spend **3-4 hours total** on reading/planning, implementation, tests, deployment, README and presentation preparation. Stop at four hours, submit what works, and clearly label unfinished work. There is no bonus for exceeding the cap. If setup or access is broken, contact us promptly rather than consuming the whole block debugging the environment.

One possible allocation: 20 minutes inspect and choose scope; 90-120 minutes implement; 35-45 minutes verify and deploy; 25-40 minutes document and prepare the demo. This is guidance, not an additional scoring rule.

**Submit within seven calendar days of the invitation email being sent.** Reply to that email if timing is difficult. Send:

- The live demo URL and access instructions (share its password privately), plus a repository link or ZIP of your source and tests. Keep the demo available for the review call; a temporary URL may need restarting.
- A short README using [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md): scope, decisions, how to run/deploy/test, limitations, elapsed time, AI tools and one verified example, and the next step toward a commercial pilot.
- A brief note of what remains unfinished. If your host cannot stay online, include a short screen recording as backup and be ready to run it live; this does not replace the running-service demonstration.

Use a private repository or source archive if convenient. Give the reviewers access and do not commit demo credentials or local runtime databases. The provided exercise code and fictional fixtures may be used and modified for this assessment, including with AI tools. Keep the historical source attribution with the data.

## Separate 30-minute presentation

The audience includes **technical and non-technical team members**. Prepare about **10 minutes of presentation and live demo**, followed by **20 minutes of discussion**. App plus README is enough; no slide deck is required.

- **End-user and commercial story:** show an incoming duty lead what needs attention, what they can trust and what they still need to verify. Complete the briefing-to-handoff journey, explain the value to a paying customer and give one observable measure of usefulness.
- **Technical delivery and process:** distinguish supplied functionality from your changes. Trace one important claim in your addition through data, code and a check you performed. Demonstrate your modified application running, including a failure/recovery case, and explain how you used and independently checked AI output. If you added external data, explain the gap it fills, its verification and what happens if its source is unavailable.
- **Next step:** explain the most important gap before a paid pilot, how another site would be added, and a pragmatic priority among reliability, onboarding, security, cost and support. You are not expected to implement that whole roadmap in this exercise.

We will ask about your choices and introduce one changed customer constraint for discussion; no additional live implementation is expected. We assess ownership/process, systems judgment, evidence/verification, and product/operability (including commercial judgment). More code, more data layers or a particular AI tool does not earn extra credit.

## Run the existing starter

Python 3.11+ is supported. From this directory:

```sh
python -m venv .venv
```

Activate it: Windows PowerShell `.venv\Scripts\Activate.ps1`; macOS/Linux `source .venv/bin/activate`. If activation is restricted on Windows, use `.venv\Scripts\python.exe` in place of `python` below.

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Upper Alder opens with a working map and an unfinished briefing. Try Pine Ridge and save a handoff, then return to Upper Alder. Its 501 briefing response is the intended task boundary; the map should remain available. API reference: http://127.0.0.1:8000/docs. The default local development server has no login; keep it on loopback. Use [DEPLOYMENT.md](DEPLOYMENT.md) before exposing a demo.

## Start editing

| File | Role |
| --- | --- |
| `briefings.py` | Existing first-site logic and the explicit Upper Alder task |
| `index.html`, `static/app.js`, `static/styles.css` | Site/snapshot selectors, briefing and handoff UI, with a Platform-style shell |
| `static/map.js`, `MAP.md` | Provided AOI map and extension guidance; overlay choices remain yours |
| `app.py` | Site/context/feed API, demo login and validated handoff endpoints |
| `storage.py` | Persistent append-only SQLite handoffs |
| `data/sites.json` | Site registry; avoid proliferating site-specific branches as you extend it |
| `tests/test_baseline.py` | First-site compatibility, persistence, validation, replay controls and login checks |
| `DEPLOYMENT.md`, `scripts/`, `Dockerfile`, `compose.yaml` | Runnable deployment paths and failure checks |

Everything required for the evidence is packaged locally. Network access is needed for dependencies, optional AI tooling, a remote preview and any optional external data you choose to retrieve. See `MANIFEST.sha256` for the frozen release contents.
