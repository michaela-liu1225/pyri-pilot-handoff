// Exercise the real controller and renderer in an in-memory DOM. This does not
// replace browser visual QA. Only transport and the unchanged map are stubbed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixtures = JSON.parse(execFileSync(process.env.PYTHON || "python", ["-c", `
import json
from app import SITES, SCENARIO, PINE, UPPER_FEEDS, UPPER_CONTEXT
from briefings import pine_ridge_briefing, reserve_briefing
briefings = {}
for site_id, site in SITES.items():
    briefings[site_id] = {}
    for snapshot in SCENARIO['snapshots']:
        briefings[site_id][snapshot['id']] = {}
        for mode in ['normal', 'stale', 'unavailable']:
            result = pine_ridge_briefing(snapshot, PINE, mode) if site_id == 'pine-ridge' else reserve_briefing(site, snapshot, UPPER_FEEDS, UPPER_CONTEXT, mode)
            briefings[site_id][snapshot['id']][mode] = result
print(json.dumps({'sites': list(SITES.values()), 'scenario': SCENARIO, 'briefings': briefings}))
`], { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }));

async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(setImmediate);
  }
  assert.fail("UI did not reach the expected state");
}

async function workspace(t, { delayUpper = false } = {}) {
  const dom = new JSDOM(readFileSync(root + "index.html", "utf8"), { url: "http://localhost/", runScripts: "outside-only" });
  t.after(() => dom.window.close());
  const state = { saved: [], failBriefing: false, failHistoryAfterSave: false, releaseUpper: null, maps: [] };
  const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(data) });
  dom.window.fetch = async (path, options = {}) => {
    const url = new URL(path, "http://localhost");
    if (url.pathname === "/api/sites") return response(fixtures.sites);
    if (url.pathname === "/api/scenario") return response(fixtures.scenario);
    const [, , , site, resource] = url.pathname.split("/");
    if (resource === "context") return response({ site: { id: site }, context: {} });
    if (resource === "briefing") {
      if (state.failBriefing) return response({ detail: "Injected service failure" }, 503);
      const payload = fixtures.briefings[site][url.searchParams.get("snapshot")][url.searchParams.get("weather_mode")];
      if (delayUpper && site === "upper-alder") return new Promise((resolve) => { state.releaseUpper = () => resolve(response(payload)); });
      return response(payload);
    }
    if (resource === "handoffs") {
      if (options.method === "POST") {
        const handoff = { ...JSON.parse(options.body), id: "saved-" + state.saved.length,
          site_id: site, created_at: "2026-11-17T17:00:00Z" };
        state.saved.push(handoff);
        return response(handoff, 201);
      }
      if (state.failHistoryAfterSave && state.saved.length) return response({ detail: "History temporarily unavailable" }, 503);
      return response(state.saved.filter((h) => h.site_id === site));
    }
    throw new Error("Unexpected request: " + path);
  };
  const context = dom.getInternalVMContext();
  const map = new vm.SyntheticModule(["createSiteMap"], function () {
    this.setExport("createSiteMap", () => ({ clear() {}, render(payload) { state.maps.push(payload.site.id); } }));
  }, { context });
  const renderer = new vm.SourceTextModule(readFileSync(root + "static/briefing.js", "utf8"), { context });
  const controller = new vm.SourceTextModule(readFileSync(root + "static/app.js", "utf8"), { context });
  await controller.link((specifier) => specifier === "./map.js" ? map : renderer);
  await controller.evaluate();
  const $ = (id) => dom.window.document.getElementById(id);
  if (!delayUpper) await until(() => $("message").textContent.startsWith("Briefing loaded"));
  else await until(() => state.releaseUpper !== null);
  const change = async (id, value) => {
    $(id).value = value;
    $(id).dispatchEvent(new dom.window.Event("change"));
    await until(() => $("message").textContent.startsWith("Briefing loaded"));
  };
  const write = (text) => { $("note").value = text; $("note").dispatchEvent(new dom.window.Event("input")); };
  const save = async () => {
    $("save").click();
    await until(() => $("message").textContent.includes("saved") && !$("save").disabled);
  };
  return { dom, $, state, change, write, save };
}

test("afternoon evidence renders zero, missingness, delay and uncertainty distinctly", async (t) => {
  const { $, change } = await workspace(t);
  await change("snapshot", "handoff");
  assert.match($("summary").textContent, /reported blocked/);
  assert.match($("attention").textContent, /FR-03.*FR-04/);
  assert.doesNotMatch($("evidence").textContent, /FR-05/);
  assert.match($("sensors").textContent, /35 min old/);
  assert.match($("sensors").textContent, /87 °C.*quality suspect/);
  const rows = [...$("assessments").querySelectorAll("tr")];
  assert.match(rows.find((r) => r.textContent.includes("Meadow Yard")).textContent, /0%/);
  assert.match(rows.find((r) => r.textContent.includes("North Cache")).textContent, /Not assessed/);
});

test("weather changes retain the draft and saved handoffs reopen as read-only evidence", async (t) => {
  const { $, change, write, save, state } = await workspace(t);
  await change("snapshot", "handoff");
  write("Confirm Intake Spur and NODE-03 before field checks.");
  await change("weather", "unavailable");
  assert.match($("note").value, /Confirm Intake Spur/);
  assert.match($("weather-note").textContent, /Weather is unknown/);
  await save();
  const original = structuredClone(state.saved[0]);
  await change("snapshot", "briefing");
  await change("weather", "normal");
  $("saved").querySelector("button").click();
  assert.equal($("snapshot").value, "handoff");
  assert.equal($("weather").value, "unavailable");
  assert.equal($("note").readOnly, true);
  assert.equal($("save").disabled, true);
  assert.equal($("snapshot").disabled, true);
  assert.match($("view-kind").textContent, /Saved handoff/);
  assert.match($("asof").textContent, /2021.*2026/);
  assert.deepEqual(state.saved[0], original);
  $("return-replay").click();
  await until(() => $("message").textContent.startsWith("Briefing loaded"));
  assert.equal($("note").readOnly, false);
  assert.equal($("note").value, original.operator_note);
});

test("a failed briefing still allows an existing handoff to be reopened", async (t) => {
  const { $, state, write, save } = await workspace(t);
  write("Saved before source failure.");
  await save();
  state.failBriefing = true;
  $("refresh").click();
  await until(() => $("title").textContent === "Briefing unavailable" && $("saved").querySelector("button"));
  $("saved").querySelector("button").click();
  assert.match($("summary").textContent, /reported passable/);
  assert.equal($("note").value, "Saved before source failure.");
});

test("a late response cannot replace another site's briefing or map", async (t) => {
  const { $, state, change } = await workspace(t, { delayUpper: true });
  await change("site", "pine-ridge");
  state.releaseUpper();
  await new Promise(setImmediate);
  assert.match($("title").textContent, /Pine Ridge/);
  assert.match($("evidence").textContent, /PR-01/);
  assert.equal($("reserve-evidence").hidden, true);
  assert.equal($("sensors").children.length, 0);
  assert.equal(state.maps.at(-1), "pine-ridge");
});

test("history reload failure does not misreport a successfully saved handoff", async (t) => {
  const { $, state, write, save } = await workspace(t);
  state.failHistoryAfterSave = true;
  write("Do not submit twice just because the history failed.");
  await save();
  assert.equal(state.saved.length, 1);
  assert.match($("message").textContent, /was saved, but the history could not refresh/);
  assert.doesNotMatch($("message").textContent, /Could not save handoff/);
});
