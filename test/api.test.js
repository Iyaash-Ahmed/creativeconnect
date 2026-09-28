/*
 * CreativeConnect — API smoke tests (node:test).
 * Boots the real server on a temp port with a throwaway SQLite DB, then
 * exercises the public site, the lead endpoint, auth, and CSRF-protected CRUD.
 * Run with:  npm test
 */
"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const PORT = 34567;
const BASE = "http://127.0.0.1:" + PORT;
const TMP_DB = path.join(os.tmpdir(), "cc-test-" + Date.now() + ".db");
const PASS = "test-pass-123";
let child;

function waitFor(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function ping() {
      fetch(url)
        .then((r) => (r.ok ? resolve() : retry()))
        .catch(retry);
      function retry() {
        if (Date.now() - start > timeoutMs) reject(new Error("server did not start in time"));
        else setTimeout(ping, 200);
      }
    })();
  });
}

function cookiesFrom(res) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const jar = {};
  for (const c of list) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return jar;
}
function cookieHeader(jar) {
  return Object.keys(jar).map((k) => k + "=" + jar[k]).join("; ");
}

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, "..", "server", "server.js")], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_PATH: TMP_DB,
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: PASS
    },
    stdio: "ignore"
  });
  await waitFor(BASE + "/health", 15000);
});

after(() => {
  if (child) child.kill();
  for (const ext of ["", "-wal", "-shm"]) {
    try { fs.unlinkSync(TMP_DB + ext); } catch (e) {}
  }
});

test("health check", async () => {
  const r = await fetch(BASE + "/health");
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(b.status, "ok");
});

test("home page is server-rendered (no template placeholders)", async () => {
  const r = await fetch(BASE + "/");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<h1>.+<\/h1>/);
  assert.ok(!html.includes("{{HERO_TITLE}}"), "placeholders should be replaced");
});

test("config.js is generated from the DB", async () => {
  const r = await fetch(BASE + "/assets/js/config.js");
  assert.equal(r.status, 200);
  const js = await r.text();
  assert.match(js, /window\.CC_CONFIG =/);
  assert.match(js, /"packages":/);
});

test("POST /api/leads stores a valid lead", async () => {
  const r = await fetch(BASE + "/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Person", email: "test@example.com", phone: "123",
      shoot_type: "Wedding", package_name: "Story", preferred_date: "2027-01-01", consent: true
    })
  });
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.ok(b.ok && b.id);
});

test("POST /api/leads rejects invalid input", async () => {
  const r = await fetch(BASE + "/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "No Email", consent: true })
  });
  assert.equal(r.status, 400);
});

test("admin endpoints require authentication", async () => {
  const r = await fetch(BASE + "/api/admin/stats");
  assert.equal(r.status, 401);
});

test("admin login, CSRF protection, and package CRUD", async () => {
  // wrong password
  let r = await fetch(BASE + "/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrong" })
  });
  assert.equal(r.status, 401);

  // correct password
  r = await fetch(BASE + "/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: PASS })
  });
  assert.equal(r.status, 200);
  const jar = cookiesFrom(r);
  assert.ok(jar.cc_admin, "session cookie set");
  assert.ok(jar.cc_csrf, "csrf cookie set");
  const ch = cookieHeader(jar);

  // authed read
  r = await fetch(BASE + "/api/admin/stats", { headers: { cookie: ch } });
  assert.equal(r.status, 200);

  // mutation WITHOUT csrf header -> 403
  r = await fetch(BASE + "/api/admin/packages", {
    method: "POST", headers: { cookie: ch, "content-type": "application/json" },
    body: JSON.stringify({ name: "No CSRF" })
  });
  assert.equal(r.status, 403);

  // mutation WITH csrf header -> 201
  r = await fetch(BASE + "/api/admin/packages", {
    method: "POST",
    headers: { cookie: ch, "content-type": "application/json", "x-csrf-token": jar.cc_csrf },
    body: JSON.stringify({ name: "Test Pkg", price: "MVR 1", features: "a\nb" })
  });
  assert.equal(r.status, 201);
  const created = await r.json();

  // it appears in the public config
  const cfg = await (await fetch(BASE + "/api/content")).json();
  assert.ok(cfg.packages.some((p) => p.name === "Test Pkg"));

  // delete it
  r = await fetch(BASE + "/api/admin/packages/" + created.id, {
    method: "DELETE", headers: { cookie: ch, "x-csrf-token": jar.cc_csrf }
  });
  assert.equal(r.status, 200);
});
