/* Provided geographic context. Candidate evidence overlay choices remain open. */
export function createSiteMap() {
  const map = L.map("map", {
    zoomControl: false,
    minZoom: 9,
    maxZoom: 17,
    zoomSnap: 0.25,
  }).setView([38.85, -120.1], 11);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
  const terrain = L.imageOverlay(
    "/static/terrain.png",
    [
      [38.73, -120.34],
      [39.04, -119.87],
    ],
    { attribution: "Terrain: USGS 3DEP, coarse sample", opacity: 0.75 },
  );
  const groups = {
    boundary: L.featureGroup(),
    assets: L.featureGroup(),
    sensors: L.featureGroup(),
  };
  Object.values(groups).forEach((group) => group.addTo(map));
  // Extension point: add selected evidence filtered to the active replay cutoff.
  // Clear/rebuild on site or cutoff change; saved handoffs must preserve evidence.
  const evidenceOverlays = L.layerGroup().addTo(map);
  const $ = (id) => document.getElementById(id);
  let allBounds = null,
    reserveBounds = null;
  const fit = (bounds) => {
    if (bounds?.isValid())
      map.fitBounds(bounds, { padding: [52, 48], maxZoom: 13, animate: false });
  };
  $("fit-all").onclick = () => fit(allBounds);
  $("fit-reserve").onclick = () => fit(reserveBounds);
  for (const [name, group] of Object.entries(groups))
    $("layer-" + name).onchange = (e) =>
      e.target.checked ? group.addTo(map) : map.removeLayer(group);
  new ResizeObserver(() => map.invalidateSize()).observe($("map"));
  function clear(message = "Loading site geometry…") {
    map.closePopup();
    evidenceOverlays.clearLayers();
    Object.values(groups).forEach((group) => group.clearLayers());
    if (map.hasLayer(terrain)) map.removeLayer(terrain);
    allBounds = reserveBounds = null;
    $("map-objects").replaceChildren();
    $("map-count").textContent = "No locations loaded";
    $("fit-all").disabled = $("fit-reserve").disabled = true;
    for (const name of Object.keys(groups)) $("layer-" + name).disabled = true;
    $("map-empty").hidden = false;
    $("map-empty").textContent = message;
    $("map-status").textContent = message;
  }
  function render(payload) {
    clear();
    const context = payload.context;
    const aois = context.aois?.features || [],
      assets = context.assets?.features || [],
      sensors = context.point_sensors?.features || [];
    $("map-site").textContent = payload.site.name;
    if (!aois.length && !assets.length && !sensors.length) {
      clear(
        "No map geometry is supplied for this demonstration site. Its briefing and handoff remain available.",
      );
      return;
    }
    if (payload.site.id === "upper-alder") terrain.addTo(map);
    for (const [kind, features] of [
      ["boundary", aois],
      ["assets", assets],
      ["sensors", sensors],
    ]) {
      const group = groups[kind];
      $("layer-" + kind).disabled = features.length === 0;
      for (const feature of features) {
        const props = feature.properties || {};
        const name = props.name || feature.id || props.id || "Unnamed location";
        const nodeId = props.sensor_id || props.id || feature.id || "";
        const label = kind === "sensors" ? `${nodeId} · ${name}` : name;
        const popup = document.createElement("div"),
          heading = document.createElement("strong"),
          detail = document.createElement("p");
        heading.textContent = label;
        detail.textContent =
          kind === "sensors"
            ? "Simulated point-sensor location. Location alone does not establish coverage, current readings or device health."
            : kind === "boundary"
              ? "Fictional protected reserve boundary."
              : `Fictional ${props.kind || "asset"}. Geometry: ${feature.geometry.type}.`;
        popup.append(heading, detail);
        const geo = L.geoJSON(feature, {
          style: {
            color: kind === "boundary" ? "#00301b" : "#a96417",
            weight: kind === "boundary" ? 2.5 : 2,
            fillColor: kind === "boundary" ? "#064429" : "#d79436",
            fillOpacity: kind === "boundary" ? 0.09 : 0.25,
          },
          pointToLayer: (f, latlng) =>
            L.marker(latlng, {
              title: label,
              alt: label,
              keyboard: true,
              icon: L.divIcon({
                className: "context-marker " + kind,
                html: "<span></span>",
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              }),
            }),
        }).addTo(group);
        const featureLayer = geo.getLayers()[0];
        featureLayer.bindPopup(popup);
        const tooltip = document.createElement("span");
        tooltip.textContent = kind === "sensors" ? nodeId : name;
        featureLayer.bindTooltip(tooltip, {
          permanent: kind !== "boundary",
          direction: kind === "sensors" ? "left" : "auto",
          offset: kind === "sensors" ? [-12, -12] : [0, 5],
          className: "map-label",
        });
        const button = document.createElement("button");
        button.className = "object-item";
        const dot = document.createElement("span");
        dot.className = "legend-dot " + kind;
        dot.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.textContent = label;
        button.append(dot, text);
        button.onclick = () => {
          $("layer-" + kind).checked = true;
          group.addTo(map);
          fit(geo.getBounds());
          featureLayer.openPopup();
        };
        $("map-objects").append(button);
      }
    }
    reserveBounds = groups.boundary.getBounds();
    allBounds = L.latLngBounds([]);
    Object.values(groups).forEach((group) => {
      if (group.getBounds().isValid()) allBounds.extend(group.getBounds());
    });
    $("fit-all").disabled = !allBounds.isValid();
    $("fit-reserve").disabled = !reserveBounds.isValid();
    $("map-empty").hidden = true;
    $("map-count").textContent =
      `${aois.length} reserve · ${assets.length} assets · ${sensors.length} sensors`;
    $("map-status").textContent =
      "Static context · fictional locations · sensor status unknown";
    fit(allBounds);
  }
  return { map, evidenceOverlays, clear, render };
}
