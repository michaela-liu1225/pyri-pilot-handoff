# Supplied AOI map

The starter supplies the spatial frame so your 3-4 hours can focus on a useful operator workflow. Preserve an AOI map pane showing the reserve boundary, assets and sensor locations. You may change its layout or implementation. **Your choice of evidence overlays remains open**; cards, tables and charts can complement the map. There is no requirement to plot every source. Optional external geospatial data may supplement the supplied evidence under the rules in README.md; it earns credit for usefulness and reliability, not merely being added.

The layout follows the current Pyri Platform's central Leaflet map and side-panel pattern, forest-green palette, and Urbanist/Lato typography. This remains a small purpose-built starter, not the production application. You are not expected to rebuild the Platform navigation or match it pixel for pixel.

## Already implemented

- Upper Alder's reserve polygon, four assets and three point sensors; all are fictional. Two support assets are outside the reserve, so **Fit all locations** includes them. **Fit reserve** focuses the boundary.
- Echo Intake retains its polygon footprint; it is not reduced to a point.
- Pan, zoom, scale, context visibility toggles and selectable locations/popups. The location list also supports keyboard selection.
- Coarse terrain background derived from the packaged USGS elevation grid. It is an approximate 1 km landscape reference, not high-resolution imagery or a navigation map. Interpolation for display adds no measurement detail. See `static/terrain-provenance.json` and `CALDOR_DATA.md`.
- Bundled Leaflet 1.9.4, Urbanist and Lato assets, with licenses in `static/vendor`. The map makes no external requests and requires no tile provider account, API key or GIS service.
- Pine Ridge has no supplied geometry: selecting it clears the previous map and explains the absence. Its existing briefing/handoff still works.

The new reserve's map loads even while its briefing returns the intentional 501 response. The unfinished briefing and handoff workflow are your implementation task; the map is provided infrastructure, not a completed answer. Static context alone does not satisfy the requirement to use two supplied evidence sources, including a satellite or point-sensor feed in the working result. Sensor locations are not sensor readings.

## Where to extend

- `static/map.js` creates the Leaflet map and renders `/api/sites/{id}/context`. `evidenceOverlays` is an empty layer group you can extend. `clear()` removes evidence and context on each refresh.
- `static/app.js` handles site/cutoff selection, the briefing, and saved handoffs. Geometry loads independently of the unfinished briefing.
- `static/styles.css` and `index.html` define the visual shell. No Node build is required.
- `/api/sites/{id}/feeds/{feed}` exposes the supplied raw records. You decide what is meaningful to show, aggregate, compare or omit.

When adding overlays, filter by `available_at` at the selected cutoff, explain spatial support/resolution, and avoid turning sparse samples into implied continuous coverage. A sensor location is not device health, an active observation or a coverage radius. Do not preload the retrospective final fire perimeter as decision evidence. Clear old-site data on site changes and distinguish saved evidence from current replay state.

Use `HANDOFF_TEMPLATE.md` to explain your scope, evidence choices, tests and next commercial step. No extra credit is awarded for reproducing this supplied map.
