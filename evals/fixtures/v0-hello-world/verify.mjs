import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseEnv } from "node:util";

const events = readFileSync(resolve("../../integration.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
assert.equal(events[0].connected, false);
const created = events.filter((event) => event.event === "created");
assert.equal(created.length, 1, "Acquire exactly one database through the host tool.");
const database = created[0].database;
assert.match(database, /^prisma_eval_hello_[a-f0-9]+$/);
assert.equal(process.env.PGHOST, "127.0.0.1");
const env = parseEnv(readFileSync(".env.local", "utf8"));
const url = new URL(env.DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, process.env.PGPORT);
assert.equal(url.pathname, `/${database}`);
assert.equal(env.HELLO_GREETING, "Hello World");
const ignored = spawnSync("git", ["-c", "core.excludesFile=/dev/null", "check-ignore", "--no-index", ".env.local"], { encoding: "utf8" });
// Fixture projects need not be Git repositories; inspect their own ignore rule instead.
assert.ok(ignored.status === 0 || /^\.env\*?\/?$/m.test(readFileSync(".gitignore", "utf8")) || /^\.env\.local$/m.test(readFileSync(".gitignore", "utf8")));
console.log("PASS: started disconnected; host created one local database; injected connection and unrelated environment value preserved");
const installed = JSON.parse(readFileSync("node_modules/@prisma/orm-postgres/package.json", "utf8"));
assert.match(installed.version, /^8\./);
console.log(`PASS: installed Prisma ORM ${installed.version}`);

const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
  encoding: "utf8", timeout: 180000, maxBuffer: 1_000_000,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
console.log(build.stdout, build.stderr);
assert.equal(build.status, 0, build.error?.message ?? "Application must build.");
const types = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], { encoding: "utf8", timeout: 30000 });
assert.equal(types.status, 0, types.stdout + types.stderr);
console.log("PASS: application builds and type-checks");

const listener = createServer();
await new Promise((done) => listener.listen(0, "127.0.0.1", done));
const port = listener.address().port;
await new Promise((done) => listener.close(done));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"], detached: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
let logs = "";
server.stdout.on("data", (chunk) => { logs = (logs + chunk).slice(-8000); });
server.stderr.on("data", (chunk) => { logs = (logs + chunk).slice(-8000); });
server.on("error", (error) => { logs += error.message; });
const stopped = new Promise((done) => server.on("close", done));
function sql(statement) {
  const result = spawnSync("psql", ["-X", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
}
async function health(expected) {
  const response = await fetch(`http://127.0.0.1:${port}/api/health?probe=${Date.now()}`, { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, expected, `Readiness must return ${expected}; got ${response.status}.`);
  assert.ok(!(await response.text()).includes(env.DATABASE_URL), "Health output must not expose the connection string.");
}
let disconnected = false;
try {
  let page;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { page = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }); break; }
    catch { await delay(200); }
  }
  assert.ok(page, `App did not start: ${logs}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Hello World/i);
  assert.ok(!html.includes(env.DATABASE_URL));
  console.log("PASS: homepage still serves Hello World without connection credentials");
  await health(200);
  console.log("PASS: readiness succeeds with the connected database");
  sql(`ALTER DATABASE "${database}" WITH ALLOW_CONNECTIONS false`);
  disconnected = true;
  sql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}'`);
  await health(503);
  console.log("PASS: readiness returns 503 when database connections are blocked");
  sql(`ALTER DATABASE "${database}" WITH ALLOW_CONNECTIONS true`);
  disconnected = false;
  await health(200);
  console.log("PASS: readiness recovers after database access is restored");
} finally {
  if (disconnected) sql(`ALTER DATABASE "${database}" WITH ALLOW_CONNECTIONS true`);
  if (server.pid) {
    try { process.kill(-server.pid, "SIGTERM"); } catch {}
    const timer = setTimeout(() => { try { process.kill(-server.pid, "SIGKILL"); } catch {} }, 3000);
    await stopped;
    clearTimeout(timer);
  }
}
