import { createSiteMap } from "./map.js";
const $ = (id) => document.getElementById(id),
  siteMap = createSiteMap();
let displayed = null,
  loadGeneration = 0;
async function request(url, options = {}) {
  const response = await fetch(url, options),
    body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail),
    );
  return body;
}
function show(briefing, savedAt) {
  displayed = briefing;
  $("save").disabled = Boolean(savedAt);
  $("title").textContent = briefing.title || "Site briefing";
  $("summary").textContent = briefing.summary || "";
  $("asof").textContent =
    "Scenario cutoff: " +
    briefing.snapshot.as_of +
    (savedAt ? " | Saved " + savedAt : "");
  $("limits").textContent = briefing.limitations || "";
  $("evidence").replaceChildren();
  for (const evidence of briefing.evidence || []) {
    const item = document.createElement("li");
    item.textContent = evidence.label;
    const source = document.createElement("span");
    source.className = "source";
    source.textContent = [
      evidence.id,
      evidence.source,
      "Observed " + evidence.observed_at,
      "Available " + evidence.available_at,
    ].join(" | ");
    item.append(source);
    $("evidence").append(item);
  }
  const weather = briefing.weather;
  $("weather-note").textContent = weather?.record
    ? "Weather context: " +
      weather.record.temperature_c +
      " °C; observed " +
      weather.record.observed_at +
      ". This sample does not establish current conditions."
    : "Weather feed unavailable. Current weather is unknown; the site report remains visible.";
}
async function loadSaved(generation) {
  const items = await request("/api/sites/" + $("site").value + "/handoffs");
  if (generation !== loadGeneration) return;
  $("saved").replaceChildren();
  for (const handoff of items) {
    const button = document.createElement("button");
    button.className = "saved";
    button.textContent = handoff.id + " / " + handoff.created_at;
    button.onclick = () => {
      show(handoff.evidence_snapshot, handoff.created_at);
      $("note").value = handoff.operator_note;
      $("message").textContent =
        "Reopened immutable saved evidence. Map shows static context only. Refresh to return to the replay.";
    };
    $("saved").append(button);
  }
  if (!items.length) $("saved").textContent = "No handoffs saved yet.";
}
async function refresh() {
  const generation = ++loadGeneration,
    site = $("site").value;
  displayed = null;
  $("save").disabled = true;
  $("title").textContent = "Loading briefing…";
  for (const id of ["summary", "asof", "limits", "weather-note"])
    $(id).textContent = "";
  $("evidence").replaceChildren();
  $("saved").replaceChildren();
  $("note").value = "";
  siteMap.clear();
  $("message").textContent = "Loading…";
  $("map-site").textContent =
    $("site").selectedOptions[0]?.textContent || "Protected site";
  // The supplied map must load even while the new-site briefing is intentionally 501.
  const mapWork = request("/api/sites/" + site + "/context")
    .then((payload) => {
      if (generation === loadGeneration) siteMap.render(payload);
    })
    .catch((error) => {
      if (generation === loadGeneration)
        siteMap.clear("Map unavailable: " + error.message);
    });
  const briefingWork = request(
    "/api/sites/" +
      site +
      "/briefing?snapshot=" +
      $("snapshot").value +
      "&weather_mode=" +
      $("weather").value,
  )
    .then((briefing) => {
      if (generation !== loadGeneration) return;
      show(briefing);
      $("message").textContent = "Briefing loaded.";
    })
    .catch((error) => {
      if (generation !== loadGeneration) return;
      $("title").textContent = "Site briefing unavailable";
      $("summary").textContent = error.message;
      $("message").textContent =
        "The map is supplied. Implement Upper Alder’s briefing and operator workflow; Pine Ridge is the working example.";
    });
  await Promise.all([mapWork, briefingWork]);
  if (generation !== loadGeneration) return;
  try {
    await loadSaved(generation);
  } catch (error) {
    if (generation === loadGeneration) $("message").textContent = error.message;
  }
}
$("refresh").onclick = refresh;
for (const id of ["site", "snapshot", "weather"]) $(id).onchange = refresh;
$("save").onclick = async () => {
  if (!displayed) return;
  const snapshot = displayed,
    generation = loadGeneration;
  $("save").disabled = true;
  try {
    const handoff = await request(
      "/api/sites/" + snapshot.site_id + "/handoffs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot_id: snapshot.snapshot.id,
          operator_note: $("note").value,
          evidence_snapshot: snapshot,
        }),
      },
    );
    if (generation !== loadGeneration) return;
    $("message").textContent =
      "Handoff " +
      handoff.id +
      " saved. It survives an app restart when storage is retained.";
    await loadSaved(generation);
  } catch (error) {
    if (generation === loadGeneration) $("message").textContent = error.message;
  } finally {
    if (generation === loadGeneration && displayed === snapshot)
      $("save").disabled = false;
  }
};
(async () => {
  try {
    const [sites, scenario] = await Promise.all([
      request("/api/sites"),
      request("/api/scenario"),
    ]);
    for (const site of sites) {
      const option = document.createElement("option");
      option.value = site.id;
      option.textContent = site.name;
      $("site").append(option);
    }
    for (const snapshot of scenario.snapshots) {
      const option = document.createElement("option");
      option.value = snapshot.id;
      option.textContent = snapshot.label;
      $("snapshot").append(option);
    }
    $("site").value = "upper-alder";
    await refresh();
  } catch (error) {
    $("message").textContent = "Startup failed: " + error.message;
    siteMap.clear("Site context unavailable. Refresh to retry.");
  }
})();
