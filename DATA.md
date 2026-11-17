# Data and replay guide

The protected AOI is **Upper Alder Timber Reserve**. It is fictional, positioned in the historical Caldor Fire region. Pine Ridge is a minimal fictional first-site fixture, not another historical incident analysis.

## Minimum useful route

Start with the reserve's authored response plan. Inspect the packaged assessments, field reports, satellite samples and point sensors, then choose a useful subset. Implement at least two supplied evidence sources, including one satellite or point-sensor feed; static map locations alone do not qualify. You can build a useful briefing without GIS libraries or new data collection. Compare at least one satellite source with the point sensors in your scope decision; explain any exclusion. The [multi-source catalog](SOURCE_CATALOG.md) explains each source and gives possible combinations.

| Input | Where | Important distinction |
| --- | --- | --- |
| Site registry | `data/sites.json`, `GET /api/sites` | Existing vs new site |
| AOI, assets, routes, plans, timber units, synthetic signals | `GET /api/sites/upper-alder/context` | Areas, points and schematic lines have different meanings |
| Toy footprint assessment | `GET /api/sites/upper-alder/feeds/assessments` | Percent overlap from a fictional assessment is not probability of damage; zero differs from absent |
| Crew/dispatcher/contractor reports | `GET /api/sites/upper-alder/feeds/reports` | Observation time differs from availability; report scope and verification matter |
| Archived airport weather | `GET /api/sites/upper-alder/feeds/weather` | A station sample is not a reserve-wide measurement; blanks are not zero |
| Sentinel-2 red/NIR and derived NDVI | `.../feeds/satellite_optical` | Real sparse samples from 10 m bands, 20 m quality layer; not a full raster |
| Landsat-8 surface temperature | `.../feeds/satellite_thermal` | Real 100 m thermal observations on a 30 m product grid; not air temperature |
| Five-minute point sensors | `.../feeds/sensors`, context `point_sensors` | Simulated point observations, gaps, duplicates, late packets and a flagged spike |
| VIIRS-like thermal detections | `.../feeds/thermal_detections` | Simulated 375 m product-like points; neither fire boundaries nor confirmed ignition |
| Daily weather, terrain, bulletins, final perimeter | `data/caldor/historical/` | Different scales; the final perimeter is retrospective only |

See [CALDOR_DATA.md](CALDOR_DATA.md) for every dataset's units, spatial resolution, real/synthetic status, transformations and source URLs. Its paths are relative to `data/caldor/` in this release. Archive extraction checksums describe the original downloads; the release manifest separately checksums the included normalized files.

## Two evidence cutoffs

`GET /api/scenario` gives:

- `briefing`: 2021-08-30 18:00 UTC (11:00 PDT).
- `handoff`: 2021-08-31 00:00 UTC (17:00 PDT on August 30).

The raw feed endpoints intentionally return the replay archive, including records not yet available at the chosen cutoff. Your briefing must select what was available using `available_at <= as_of`. Keep the observation/assessment time visible as well. The weather availability timestamps add a documented fictional ten-minute publication lag.

Satellite acquisition times and values are real, but their replay availability times are explicit exercise assumptions (Sentinel-2 +24 hours; Landsat +7 days), not verified historical delivery times. The August 29 optical scene becomes available between the two cutoffs. Point sensors and VIIRS-like detections are entirely simulated. Their timestamps and values are not historical fire observations. See `data/multisource/provenance.json` for scene IDs, transformations and unsigned source URLs.

An operator's handoff is saved at the real time the app runs. `scenario_as_of` is the historical evidence cutoff. Do not confuse these two clocks. The saved evidence object should be a snapshot, not a pointer that silently changes with a later feed request.

## Failure and recovery controls

The weather endpoint accepts `?mode=normal`, `?mode=stale` and `?mode=unavailable`. Stale returns only the first historical weather record; unavailable returns HTTP 503. Returning to normal restores the feed. The supplied UI sends its replay selection as `weather_mode` to the briefing endpoint; your implementation must honor it. Reports and assessments stay available.

You choose whether weather is useful in the main briefing. If omitted from your analysis, the workflow should still make its availability/absence clear when exercising the failure case. Do not turn a feed error into a claim that the site is safe. Explain a reasonable freshness rule if you use one; the package supplies no universal hazard threshold.

## Ways to exercise judgment

You could emphasize a shift-to-shift comparison, the relationship between reserve exposure and access constraints, or a transparent rule with weather/terrain context. Preserve the distinction between reported evidence, your interpretation and an operator-authored action. More layers are not intrinsically better. The historic final perimeter may appear only in a separately labelled retrospective view.

## Supplied geographic frame

See MAP.md for the provided reserve/asset/sensor pane. It uses static fictional locations and a coarse USGS terrain reference; no evidence overlay is preselected. Sensor placement does not establish coverage or current status.

## Optional external sources

See README.md for the optional additional-data rules. External sources supplement the common fixtures and remain within the four-hour cap. Record observation/validity, availability and retrieval separately; label assumptions rather than implying verified historical delivery. Keep later-created context separate from replay decision evidence. Cache a small extract where permitted or provide retrieval instructions, and handle source failure without losing the core workflow.
