// Presentation only. Replay and interpretation rules live in evidence.py.
const $ = (id) => document.getElementById(id);

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function timestamp(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date) + " UTC";
}

function value(number, unit = "") {
  if (number === null || number === undefined || number === "" || !Number.isFinite(Number(number))) return "Not available";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(Number(number)) + unit;
}

function badge(state) {
  const labels = {
    recent: "Recent", stale: "Stale", missing: "No usable data", needs_review: "Review quality",
    unavailable: "Unavailable", reported_blocked: "Blockage reported", reported_passable: "Passable reported",
    unverified: "Unverified", unknown: "No report", context: "Context only",
  };
  const element = node("span", labels[state] || state, "state");
  element.dataset.state = state;
  return element;
}

function disclosure(title) {
  const detail = node("details", undefined, "evidence-detail");
  const summary = node("summary");
  summary.append(typeof title === "string" ? node("span", title) : title);
  detail.append(summary);
  const body = node("div", undefined, "detail-body");
  detail.append(body);
  return { detail, summary, body };
}

function provenance(record, source, id = record.id) {
  return node("p", [id, source, "Observed " + timestamp(record.observed_at || record.assessed_at),
    "Available " + timestamp(record.available_at)].filter(Boolean).join(" · "), "source");
}

function renderAttention(briefing) {
  $("attention-section").hidden = !briefing.attention;
  $("attention").replaceChildren();
  for (const item of briefing.attention || []) {
    const row = node("li", undefined, "attention-item");
    row.dataset.priority = item.priority;
    row.append(node("h4", item.title), node("p", item.detail), node("p", item.action, "next-action"));
    if (item.evidence_ids.length) row.append(node("span", "Evidence: " + item.evidence_ids.join(" · "), "source"));
    $("attention").append(row);
  }
}

function renderRoutes(briefing) {
  $("routes").replaceChildren();
  for (const route of briefing.routes || []) {
    const title = node("span", undefined, "disclosure-title");
    title.append(node("strong", route.name), badge(route.state));
    const { detail, body } = disclosure(title);
    if (route.report) {
      body.append(node("p", route.report.note), provenance(route.report, "Fictional report / " + route.report.observer_role));
      body.append(node("p", value(route.age_minutes, " minutes") + " since this observation at the cutoff.", "small"));
    } else body.append(node("p", "No explicit access report was available at this cutoff."));
    for (const report of route.unverified_reports) {
      const uncertain = node("div", undefined, "uncertainty");
      uncertain.append(node("strong", "Unverified report"), node("p", report.note), provenance(report, report.observer_role));
      body.append(uncertain);
    }
    const names = (briefing.plans || []).filter((p) => route.affected_targets.includes(p.target_id)).map((p) => p.target_name);
    body.append(node("p", "Required by: " + names.join("; ") + ".", "small"), node("p", route.interpretation, "small muted"));
    $("routes").append(detail);
  }
}

function renderSensors(briefing) {
  $("sensors").replaceChildren();
  for (const sensor of briefing.sensors || []) {
    const title = node("span", undefined, "sensor-summary");
    const identity = node("span");
    identity.append(node("strong", sensor.name), node("span", sensor.id, "source"));
    const reading = node("span", undefined, "sensor-reading");
    reading.append(node("strong", value(sensor.latest?.temperature_c, " °C")),
      node("span", sensor.age_minutes === null ? "No usable observation" : value(sensor.age_minutes, " min old"), "source"));
    title.append(identity, reading, badge(sensor.state));
    const { detail, summary, body } = disclosure(title);
    const issues = [];
    if (sensor.flagged_count) issues.push(sensor.flagged_count + " flagged packet(s)");
    if (sensor.missing_samples_between_observations) issues.push(sensor.missing_samples_between_observations + " missing samples in shift history");
    if (sensor.duplicates_removed) issues.push(sensor.duplicates_removed + " duplicate removed");
    if (issues.length) summary.append(node("span", issues.join(" · "), "quality-note"));
    if (sensor.latest) {
      body.append(node("p", "Latest quality-good reading: " + value(sensor.latest.temperature_c, " °C") +
        " · Humidity " + value(sensor.latest.relative_humidity_pct, "%") + " · Battery " + value(sensor.latest.battery_pct, "%")),
        provenance(sensor.latest, sensor.source));
    }
    if (sensor.trend) {
      const trend = sensor.trend;
      body.append(node("p", "Temperature changed " + (trend.change_c > 0 ? "+" : "") + value(trend.change_c, " °C") +
        " across " + value(trend.elapsed_minutes, " minutes") + " of available readings."),
        node("p", timestamp(trend.from_at) + " → " + timestamp(trend.to_at) + ". " + trend.note, "source"));
    }
    for (const sample of sensor.flagged_examples) {
      body.append(node("p", "Excluded from reliable readings: " + sample.id + " · " + value(sample.temperature_c, " °C") +
        " · quality " + sample.quality + (sensor.conflicting_packets.includes(sample.id) ? " · conflicting duplicate" : ""), "quality-note"),
        provenance(sample, sensor.source));
    }
    for (const gap of sensor.gaps) body.append(node("p", gap.missing_samples + " scheduled samples missing between " +
      timestamp(gap.after) + " and " + timestamp(gap.before) + ".", "small"));
    body.append(node("p", sensor.good_packets + " quality-good / " + sensor.available_packets + " unique delivered packets. " +
      "Stale after " + sensor.stale_after_minutes + " minutes without a quality-good reading.", "small"),
      node("p", "Simulated observations. " + sensor.measurement_support + ".", "small muted"));
    $("sensors").append(detail);
  }
}

function renderAssessments(briefing) {
  $("assessments").replaceChildren();
  for (const assessment of briefing.assessments || []) {
    const row = node("tr"), name = node("th", assessment.name);
    name.scope = "row";
    const cell = node("td", assessment.value === null ? (assessment.state === "not_assessed" ? "Not assessed" : "Value missing") : value(assessment.value, "%"));
    if (assessment.record) cell.append(node("span", assessment.record.assessment_id, "source"));
    row.append(name, cell);
    $("assessments").append(row);
  }
}

function renderPlans(briefing) {
  $("plans").replaceChildren();
  for (const plan of briefing.plans || []) {
    const item = node("li");
    item.append(node("strong", plan.target_name), node("p", plan.step),
      node("span", plan.owner_role + " · Authored task duration: " + plan.required_minutes + " min. This is not a fire-arrival estimate.", "source"));
    $("plans").append(item);
  }
}

function renderWeather(weather) {
  const section = $("weather-note");
  section.replaceChildren();
  if (!weather) return;
  const state = weather.state || (weather.record ? "context" : "unavailable");
  section.dataset.state = state;
  const title = node("div", undefined, "weather-heading");
  title.append(node("strong", "Optional weather"), badge(state));
  section.append(title);
  if (weather.record) {
    section.append(node("p", value(weather.record.temperature_c, " °C") + " · Observed " + timestamp(weather.record.observed_at)));
    if (weather.age_minutes !== undefined) section.append(node("p", value(weather.age_minutes, " min old") +
      " at the scenario cutoff. Available " + timestamp(weather.record.available_at) + ".", "source"));
  } else section.append(node("p", "Weather is unknown. The core briefing and handoff remain available."));
  section.append(node("p", weather.interpretation || "This point sample does not establish current site conditions.", "small"));
}

export function renderBriefing(briefing, savedAt) {
  $("title").textContent = briefing.title || "Site briefing";
  $("summary").textContent = briefing.summary || "";
  $("asof").textContent = "Scenario cutoff: " + timestamp(briefing.snapshot.as_of) + (savedAt ? " · Saved: " + timestamp(savedAt) : "");
  $("view-kind").textContent = savedAt ? "Saved handoff · read only" : briefing.snapshot.label;
  $("view-kind").dataset.saved = Boolean(savedAt);
  $("limits").textContent = briefing.limitations || "";
  $("reserve-evidence").hidden = !briefing.sensors;
  renderAttention(briefing); renderRoutes(briefing); renderSensors(briefing);
  renderAssessments(briefing); renderPlans(briefing); renderWeather(briefing.weather);
  $("evidence").replaceChildren();
  $("evidence-count").textContent = (briefing.evidence || []).length;
  for (const evidence of briefing.evidence || []) {
    const item = node("li");
    item.append(node("p", evidence.label), provenance(evidence, evidence.source));
    $("evidence").append(item);
  }
  $("rules").replaceChildren();
  $("rules-detail").hidden = !briefing.rules;
  for (const rule of Object.values(briefing.rules || {})) $("rules").append(node("li", rule));
}

export function clearBriefing() {
  for (const id of ["summary", "asof", "limits", "weather-note", "view-kind"]) $(id).textContent = "";
  for (const id of ["attention", "routes", "sensors", "assessments", "plans", "evidence", "rules"]) $(id).replaceChildren();
  $("attention-section").hidden = true;
  $("reserve-evidence").hidden = true;
  $("rules-detail").hidden = true;
}
