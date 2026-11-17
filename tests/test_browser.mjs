// Real Chromium and a fresh authenticated FastAPI process. No transport or map
// stubs except explicit injected failures. No demo password or database needed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const password = randomBytes(24).toString("base64url");
let browser, server, directory, origin, serverLog = "";

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "pyri-browser-"));
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  origin = "http://127.0.0.1:" + port;
  server = spawn(process.env.PYTHON || "python", [
    "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", String(port),
  ], {
    cwd: root,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", HANDOFF_DB: join(directory, "handoffs.sqlite3"),
      DEMO_PASSWORD_SHA256: createHash("sha256").update(password).digest("hex") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.on("error", (error) => { serverLog += error.message; });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { serverLog += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(origin + "/healthz")).ok; } catch {}
    if (ready) break;
    if (server.exitCode !== null) break;
    await delay(100);
  }
  assert.ok(ready, "Test server failed to start: " + serverLog);
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill("SIGTERM");
    await Promise.race([stopped, delay(5000)]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function workspace(t, viewport = { width: 1440, height: 900 }, mobile = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
    httpCredentials: { username: "reviewer", password } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(async () => { await context.close(); assert.deepEqual(errors, [], "Unexpected browser script errors"); });
  await page.goto(origin, { waitUntil: "networkidle" });
  await ready(page);
  await page.locator("#map-empty").waitFor({ state: "hidden" });
  return page;
}

async function ready(page) {
  await page.locator("#message").filter({ hasText: "Briefing loaded." }).waitFor();
}

async function change(page, id, value) {
  await page.locator("#" + id).selectOption(value);
  await ready(page);
}

async function insideViewport(page, selector) {
  const bounds = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  assert.ok(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 &&
    bounds.y + bounds.height <= viewport.height + 1, selector + " is clipped: " + JSON.stringify(bounds));
}

async function save(page) {
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/sites/upper-alder/handoffs") &&
    response.request().method() === "POST");
  await page.getByRole("button", { name: "Save handoff", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const saved = await response.json();
  await page.locator("#handoff-message").filter({ hasText: saved.id }).waitFor();
  await page.waitForFunction(() => !document.getElementById("save").disabled);
  await insideViewport(page, "#handoff-message");
  await insideViewport(page, "#save");
  return saved;
}

test("desktop shell, real map layers and navigation fit common laptop viewports", async (t) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1024, height: 768 }]) {
    const page = await workspace(t, viewport);
    assert.equal(await page.locator("#map-objects button").count(), 8);
    assert.equal(await page.locator(".leaflet-marker-icon").count(), 6);
    await insideViewport(page, ".app-header");
    await insideViewport(page, ".toolbar");
    await insideViewport(page, ".map-pane");
    await insideViewport(page, "footer");
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    assert.ok(dimensions.width <= viewport.width && dimensions.height <= viewport.height + 1);
    for (const kind of ["boundary", "assets", "sensors"]) {
      await page.locator("#layer-" + kind).uncheck();
      if (kind === "sensors") assert.equal(await page.locator(".leaflet-marker-icon.sensors").count(), 0);
      await page.locator("#layer-" + kind).check();
    }
    await page.locator("#map-objects button").filter({ hasText: "NODE-03" }).click();
    await page.locator(".leaflet-popup-content").filter({ hasText: "West timber plot" }).waitFor();
    await page.getByRole("button", { name: "Fit all locations", exact: true }).click();
    await page.getByRole("button", { name: "Write handoff", exact: true }).click();
    await insideViewport(page, "#note");
    await insideViewport(page, "#save");
    await page.getByRole("button", { name: "Review briefing", exact: true }).click();
    await insideViewport(page, "#title");
    assert.equal(await page.evaluate(() => document.activeElement.id), "title");
  }
});

test("weather drafts, save feedback and reopened historical evidence survive a browser reload", async (t) => {
  const page = await workspace(t);
  await change(page, "snapshot", "handoff");
  assert.match(await page.locator("#summary").innerText(), /reported blocked/);
  await page.getByRole("button", { name: "Write handoff", exact: true }).click();
  assert.equal(await page.locator("#save").isDisabled(), true);
  await page.getByLabel("Operator note", { exact: true }).fill("Confirm route access before field work.");
  await page.getByRole("button", { name: "Add suggested checks", exact: true }).click();
  const note = await page.locator("#note").inputValue();
  for (const sensor of ["NODE-01", "NODE-02", "NODE-03"]) assert.ok(note.includes(sensor));
  await page.getByRole("button", { name: "Add suggested checks", exact: true }).click();
  assert.equal(await page.locator("#note").inputValue(), note);
  for (const [mode, state] of [["unavailable", "unavailable"], ["stale", "stale"], ["normal", "recent"], ["unavailable", "unavailable"]]) {
    await change(page, "weather", mode);
    assert.equal(await page.locator("#weather-note").getAttribute("data-state"), state);
    assert.equal(await page.locator("#note").inputValue(), note);
  }
  await page.getByRole("button", { name: "Write handoff", exact: true }).click();
  const saved = await save(page);
  assert.equal(saved.evidence_snapshot.weather.state, "unavailable");
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  await page.locator('button[title="Handoff ' + saved.id + '"]').click();
  await insideViewport(page, "#title");
  await insideViewport(page, "#return-replay");
  assert.equal(await page.locator("#note").inputValue(), note);
  assert.equal(await page.locator("#note").evaluate((element) => element.readOnly), true);
  assert.equal(await page.locator("#save").isDisabled(), true);
  assert.equal(await page.locator("#snapshot").inputValue(), "handoff");
  assert.equal(await page.locator("#snapshot").isDisabled(), true);
  assert.equal(await page.locator("#weather").inputValue(), "unavailable");
  assert.match(await page.locator("#asof").innerText(), /2021.*Saved:/);
  await page.getByRole("button", { name: "View saved note", exact: true }).click();
  await insideViewport(page, "#note");
  await page.getByRole("button", { name: "Review briefing", exact: true }).click();
  await page.getByRole("button", { name: "Return to replay", exact: true }).click();
  await ready(page);
  await change(page, "site", "pine-ridge");
  assert.match(await page.locator("#title").innerText(), /Pine Ridge/);
  assert.equal(await page.locator("#reserve-evidence").isVisible(), false);
  await change(page, "site", "upper-alder");
  assert.match(await page.locator("#title").innerText(), /Upper Alder/);
});

test("save failures keep the note and retry succeeds; a history failure remains a successful save", async (t) => {
  const page = await workspace(t);
  await page.getByRole("button", { name: "Write handoff", exact: true }).click();
  const note = "Keep this note when the service refuses a save.";
  await page.getByLabel("Operator note", { exact: true }).fill(note);
  const endpoint = "**/api/sites/upper-alder/handoffs";
  await page.route(endpoint, (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, json: { detail: "Injected save failure" } }) : route.continue());
  await page.getByRole("button", { name: "Save handoff", exact: true }).click();
  await page.locator("#handoff-message").filter({ hasText: "Could not save handoff" }).waitFor();
  await insideViewport(page, "#handoff-message");
  assert.equal(await page.locator("#note").inputValue(), note);
  assert.equal(await page.locator("#save").isEnabled(), true);
  await page.unroute(endpoint);
  await save(page);
  await page.route(endpoint, (route) => route.request().method() === "GET"
    ? route.fulfill({ status: 503, json: { detail: "Injected history failure" } }) : route.continue());
  await page.getByLabel("Operator note", { exact: true }).fill("Save still succeeds when the history cannot refresh.");
  const saved = await save(page);
  const status = await page.locator("#handoff-message").innerText();
  assert.ok(status.includes(saved.id));
  assert.match(status, /was saved, but the history could not refresh/);
  assert.doesNotMatch(status, /Could not save handoff/);
});

test("an in-flight save locks the submitted draft until its outcome is known", async (t) => {
  const page = await workspace(t);
  await page.getByRole("button", { name: "Write handoff", exact: true }).click();
  await page.getByLabel("Operator note", { exact: true }).fill("The submitted note must match the success feedback.");
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/sites/upper-alder/handoffs", async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  });
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("button", { name: "Save handoff", exact: true }).click();
  await page.locator("#handoff-message").filter({ hasText: "Saving handoff" }).waitFor();
  assert.equal(await page.locator("#note").evaluate((element) => element.readOnly), true);
  assert.equal(await page.locator("#use-suggestions").isDisabled(), true);
  assert.equal(await page.locator("#save").isDisabled(), true);
  release();
  assert.equal((await responsePromise).status(), 201);
  await page.waitForFunction(() => !document.getElementById("save").disabled);
  assert.equal(await page.locator("#note").evaluate((element) => element.readOnly), false);
});

test("mobile and tablet controls wrap; long-note feedback and saving remain visible", async (t) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 768, height: 1024 }]) {
    const page = await workspace(t, viewport, viewport.width < 600);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole("button", { name: "Write handoff", exact: true }).click();
    const longNote = "A".repeat(2000);
    await page.getByLabel("Operator note", { exact: true }).fill(longNote);
    await page.getByRole("button", { name: "Add suggested checks", exact: true }).click();
    await page.locator("#handoff-message").filter({ hasText: "exceed 2,000 characters" }).waitFor();
    assert.equal(await page.locator("#note").inputValue(), longNote);
    await insideViewport(page, "#handoff-message");
    await page.getByLabel("Operator note", { exact: true }).fill("Mobile check: verify access and telemetry.");
    const saved = await save(page);
    await page.locator('button[title="Handoff ' + saved.id + '"]').click();
    await insideViewport(page, "#title");
    await page.getByRole("button", { name: "View saved note", exact: true }).click();
    await insideViewport(page, "#note");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
});
