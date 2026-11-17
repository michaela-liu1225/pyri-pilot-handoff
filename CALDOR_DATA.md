# Data guide

The 2021 Caldor Fire is the historical setting. The **Upper Alder Timber Reserve** and everything attributed to its operators are fictional. The reserve outline is placed southwest of Lake Tahoe and overlaps the archived Caldor footprint. It represents an invented management boundary.

Start with the reserve boundary, exercise assessments, and field reports. Use the other layers if they help answer a question you want the card to address.

| File under data/ | What it contains | Scale and use |
| --- | --- | --- |
| scenario.json | Reserve ID, map bounds, and two briefing cutoffs | Morning is Aug 30 at 11:00 PDT (18:00 UTC). Handoff is Aug 30 at 17:00 PDT (Aug 31 00:00 UTC). |
| aois.geojson | Fictional reserve polygon, objective, and links to its supporting assets | Reserve is the protected AOI. The feature ID is the target key for its plan and assessment. |
| timber_units.geojson | Three example management units inside the reserve | Fictional stand polygons and management priorities. They sample the reserve and leave some land unclassified. |
| assets.geojson, access_routes.geojson | Four fictional assets and three fictional access lines | Asset locations are points except Echo Intake, which is a polygon. Route coordinates are schematic. |
| response_plans.json | Authored reserve and asset steps, roles, setup time, and access dependency | Join on target_id. Minutes are the time the operator says the step requires. North Cache has no plan. |
| exercise_assessments.csv | Supplied toy-model footprint overlap, including a reserve-level estimate | Percent of the AOI or modelled asset surroundings in a fictional footprint. For point assets, the model used a surrounding area. These are packaged results from one assessment, rather than probabilities, validated estimates, or results to reverse-engineer. |
| exercise_signals.geojson | Two fictional mapped extents and one fictional thermal detection | Two irregular polygon snapshots and a point representing a nominal 375 m thermal pixel. The thermal detection is unconfirmed. |
| field_reports.json | Fictional access observations with route IDs, role, and text | Irregular event times. A report about the main road does not by itself establish the condition of the intake spur. |
| historical/airport_observations.csv | Real archived TVL/KTVL weather, Aug 29–Sep 1 UTC | Single station, mostly hourly with special reports. Wind direction is where the wind comes from. Blanks mean unavailable or, for direction in calm conditions, undefined. |
| historical/daily_weather.csv | Real GHCN daily min/max temperature and precipitation, Aug 1–29 | Same airport, calendar-day aggregates. Blank means missing or flagged. Zero precipitation is a value. Use as background. |
| historical/terrain_grid.csv | USGS elevations resampled to a 47 × 31 grid | One sample per 0.01° cell, roughly 0.9 km east–west by 1.1 km north–south here. Row 0 is north. Elevations are meters. Use as terrain context. |
| historical/incident_bulletins.json | Six real CAL FIRE summaries with issue times, area, and containment | Incident-wide facts and paraphrases. Area and containment describe the incident, rather than individual assets or the fictional spur. |
| historical/final_fire_perimeter.geojson | Real simplified and geometry-repaired final NIFC perimeter | Retrospective context only. It spans beyond the exercise map bounds. An overlap does not establish damage or the timing of exposure. |

## Time and interpretation

- Use records with available_at at or before the selected cutoff. observed_at or assessed_at describes when the observation or assessment refers to. For archive airport weather, a **fictional ten-minute lag** supplies available_at because the archive export has no publication time.
- The final NIFC perimeter is retrospective. Keep it out of both briefings’ decision evidence. An optional after-action view can show it separately. The terrain grid is an untimed landscape reference, and the daily series ends before the two briefings.
- The morning and afternoon briefings can tell different stories even when an exposure estimate stays fixed. An access constraint can change what a crew can do without changing a modelled footprint. Station winds and terrain can provide context for an interpretation. They do not establish local spread, cause, or arrival time.
- GeoJSON and grid coordinates use WGS84 longitude, latitude. If reporting physical areas or distances, describe your units and use a suitable projection, geodesic calculation, or clearly labelled approximation. A point or station is different from an area measurement.

## Source and preparation notes

- The airport series uses the Iowa Environmental Mesonet archive of ASOS/METAR observations. It retains the archive’s reported units and timestamps after converting the latter to UTC ISO format. Calm wind direction was blanked. [IEM ASOS archive](https://mesonet.agron.iastate.edu/request/download.phtml) · [Exact extraction](https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=TVL&data=tmpc&data=dwpc&data=relh&data=drct&data=sknt&data=gust&data=vsby&year1=2021&month1=8&day1=29&year2=2021&month2=9&day2=2&tz=Etc%2FUTC&format=onlycomma&latlon=yes&elev=yes&missing=empty&trace=empty&report_type=3&report_type=4)
- Daily weather comes from NOAA NCEI GHCN-Daily station USW00093230. The extract converts tenths of degrees Celsius and millimeters to decimal Celsius and millimeters and omits quality-flagged values. [NOAA station](https://www.ncdc.noaa.gov/cdo-web/datasets/GHCND/stations/GHCND%3AUSW00093230/detail) · [Source CSV](https://noaa-ghcn-pds.s3.amazonaws.com/csv/by_station/USW00093230.csv)
- Terrain comes from the USGS 3DEP image service. The export resamples elevation to the bounding box and reports grid cell center coordinates. It is a landscape sample rather than a survey or an event-time terrain record. [USGS 3DEP](https://www.usgs.gov/3d-elevation-program) · [Exact extraction](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=-120.34,38.73,-119.87,39.04&bboxSR=4326&imageSR=4326&size=47,31&adjustAspectRatio=false&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image)
- The perimeter comes from NIFC WFIGS record 58464. The service generalized geometry at 0.0008° and the export was repaired to valid polygon geometry. [NIFC record](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/58464) · [Exact extraction](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query?where=OBJECTID%3D58464&outFields=OBJECTID%2Cpoly_IncidentName%2Cpoly_FeatureCategory&outSR=4326&maxAllowableOffset=0.0008&f=geojson)
- Each bulletin links to the original report. The displayed local issue time was converted from PDT to UTC for available_at. [CAL FIRE update index](https://www.fire.ca.gov/incidents/2021/8/14/caldor-fire/updates)
- archive_manifest.json records SHA-256 checksums of the four original machine-readable downloads used for the normalized CSV and GeoJSON extracts.
