import { createSiteMap } from "./map.js";
import { clearBriefing, renderBriefing, timestamp } from "./briefing.js";

const $ = (id) => document.getElementById(id);
const siteMap = createSiteMap();
const drafts = new Map();
let displayed = null, loadGeneration = 0, savedView = false, activeKey = "", saving = null;
let historyGeneration = 0;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body;
  try { body = await response.json(); }
  catch { throw new Error("The service returned an unreadable response. Please retry."); }
  if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
  return body;
}

function updateControls() {
  const busy = Boolean(displayed) && saving === displayed;
  $("save").disabled = !displayed || savedView || saving === displayed || !$("note").value.trim();
  $("note").readOnly = savedView || busy;
  $("use-suggestions").hidden = !displayed?.suggested_note;
  $("use-suggestions").disabled = savedView || busy;
  $("return-replay").hidden = !savedView;
  $("snapshot").disabled = savedView;
  $("weather").disabled = savedView;
  $("go-handoff").textContent = savedView ? "View saved note" : "Write handoff";
}

function handoffMessage(text) {
  $("handoff-message").textContent = text;
  if (text) $("handoff-message").scrollIntoView({ block: "nearest" });
}

function reviewBriefing() {
  $("briefing-heading").scrollIntoView({ block: "start" });
  $("title").focus({ preventScroll: true });
}

function rememberDraft() {
  if (!savedView && activeKey) drafts.set(activeKey, $("note").value);
}

function show(briefing, savedAt) {
  displayed = briefing;
  savedView = Boolean(savedAt);
  renderBriefing(briefing, savedAt);
  updateControls();
}

async function loadSaved(generation) {
  const requestGeneration = ++historyGeneration;
  const current = () => generation === loadGeneration && requestGeneration === historyGeneration;
  let items;
  try { items = await request("/api/sites/" + $("site").value + "/handoffs"); }
  catch (error) { if (current()) throw error; else return; }
  if (!current()) return;
  $("saved").replaceChildren();
  for (const handoff of items) {
    const button = document.createElement("button");
    button.className = "saved";
    const label = document.createElement("strong"), preview = document.createElement("span");
    label.textContent = (handoff.evidence_snapshot.snapshot.label || handoff.snapshot_id) + " · Saved " + timestamp(handoff.created_at);
    const note = handoff.operator_note.trim().replace(/\s+/g, " ");
    preview.className = "saved-preview";
    preview.textContent = note.length > 120 ? note.slice(0, 120) + "…" : note;
    button.append(label, preview);
    button.title = "Handoff " + handoff.id;
    button.onclick = () => {
      rememberDraft();
      $("snapshot").value = handoff.snapshot_id;
      $("weather").value = handoff.evidence_snapshot.weather.mode;
      $("note").value = handoff.operator_note;
      show(handoff.evidence_snapshot, handoff.created_at);
      $("message").textContent = "Reopened the original note and evidence. The map shows static site context.";
      $("handoff-message").textContent = "Saved note · read only. Use Return to replay to create a new handoff.";
      reviewBriefing();
    };
    $("saved").append(button);
  }
  if (!items.length) $("saved").textContent = "No handoffs saved yet.";
}

async function refresh() {
  rememberDraft();
  const generation = ++loadGeneration;
  const site = $("site").value, snapshot = $("snapshot").value, weather = $("weather").value;
  displayed = null;
  savedView = false;
  activeKey = site + ":" + snapshot;
  $("note").value = drafts.get(activeKey) || "";
  updateControls();
  $("title").textContent = "Loading briefing…";
  clearBriefing();
  $("saved").replaceChildren();
  siteMap.clear();
  $("message").textContent = "Loading…";
  $("handoff-message").textContent = "";
  document.querySelector(".decision-pane").scrollTop = 0;
  $("map-site").textContent = $("site").selectedOptions[0]?.textContent || "Protected site";
  const mapWork = request("/api/sites/" + site + "/context")
    .then((payload) => { if (generation === loadGeneration) siteMap.render(payload); })
    .catch((error) => { if (generation === loadGeneration) siteMap.clear("Map unavailable: " + error.message); });
  const briefingWork = request("/api/sites/" + site + "/briefing?snapshot=" + snapshot + "&weather_mode=" + weather)
    .then((briefing) => {
      if (generation !== loadGeneration) return;
      show(briefing);
      $("message").textContent = "Briefing loaded. Review the evidence, then leave a handoff.";
    })
    .catch((error) => {
      if (generation !== loadGeneration) return;
      $("title").textContent = "Briefing unavailable";
      $("summary").textContent = error.message;
      $("message").textContent = "Refresh to retry. Existing saved handoffs can still be reopened below.";
    });
  await Promise.all([mapWork, briefingWork]);
  if (generation !== loadGeneration) return;
  try { await loadSaved(generation); }
  catch (error) {
    if (generation === loadGeneration) $("message").textContent = "Saved handoffs could not be loaded: " + error.message;
  }
}

$("refresh").onclick = refresh;
$("return-replay").onclick = refresh;
$("go-handoff").onclick = () => {
  $("handoff-section").scrollIntoView({ block: "start" });
  $("note").focus({ preventScroll: true });
};
$("review-briefing").onclick = reviewBriefing;
for (const id of ["site", "snapshot", "weather"]) $(id).onchange = refresh;
$("note").oninput = () => { rememberDraft(); $("handoff-message").textContent = ""; updateControls(); };
$("use-suggestions").onclick = () => {
  if (!displayed?.suggested_note || savedView) return;
  const current = $("note").value;
  if (current.includes(displayed.suggested_note)) return;
  const next = current ? current + "\n\n" + displayed.suggested_note : displayed.suggested_note;
  if (next.length > 2000) {
    handoffMessage("Suggested checks would exceed 2,000 characters. Your note has been kept unchanged.");
    return;
  }
  $("note").value = next;
  $("handoff-message").textContent = "";
  rememberDraft();
  updateControls();
  $("note").focus();
};
$("save").onclick = async () => {
  if (!displayed || savedView || saving === displayed || !$("note").value.trim()) return;
  const snapshot = displayed, generation = loadGeneration;
  saving = snapshot;
  updateControls();
  handoffMessage("Saving handoff…");
  try {
    const handoff = await request("/api/sites/" + snapshot.site_id + "/handoffs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot_id: snapshot.snapshot.id, operator_note: $("note").value, evidence_snapshot: snapshot }),
    });
    if (generation !== loadGeneration) return;
    handoffMessage("Handoff " + handoff.id + " saved with this evidence. Reopen it below, including after an app restart.");
    try { await loadSaved(generation); }
    catch (error) {
      if (generation === loadGeneration) handoffMessage("Handoff " + handoff.id +
        " was saved, but the history could not refresh. Use Refresh briefing to retry. " + error.message);
    }
  } catch (error) {
    if (generation === loadGeneration) handoffMessage("Could not save handoff: " + error.message);
  } finally {
    if (saving === snapshot) saving = null;
    if (generation === loadGeneration) {
      updateControls();
      $("handoff-message").scrollIntoView({ block: "nearest" });
    }
  }
};

(async () => {
  try {
    const [sites, scenario] = await Promise.all([request("/api/sites"), request("/api/scenario")]);
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
    $("message").textContent = "Startup failed: " + error.message + ". Reload the page to retry.";
    siteMap.clear("Site context unavailable.");
  }
})();
