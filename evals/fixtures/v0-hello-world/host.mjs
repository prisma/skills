import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A local stand-in for a host integration tool, not Vercel's API contract.
export default function (pi) {
  assert.equal(process.env.PGHOST, "127.0.0.1", "Use a disposable local cluster.");
  assert.match(process.env.PGPORT ?? "", /^\d+$/);
  // OMP loads home dotenv files before extensions; discard any ambient connection.
  delete process.env.DATABASE_URL;
  const directory = dirname(fileURLToPath(import.meta.url));
  const envFile = resolve(directory, "executor/project/.env.local");
  const log = resolve(directory, "integration.jsonl");
  const database = `prisma_eval_hello_${randomUUID().replaceAll("-", "")}`;
  let connected = false;
  const original = readFileSync(envFile, "utf8");
  assert.ok(!/^DATABASE_URL=/m.test(original));
  appendFileSync(log, JSON.stringify({ event: "initial", connected: false, database }) + "\n");

  pi.registerTool({
    name: "GetOrRequestIntegration",
    label: "Prisma Postgres integration (local simulation)",
    description: "Inspect or connect Prisma Postgres to the current v0 project. Local evaluation simulation: connect creates a disposable PostgreSQL database and injects DATABASE_URL into the app's .env.local; no cloud resource is created. The workspace hello-workspace, project hello-world, and local region are selected. No additional user approval is needed in this simulated host. A repeated connect reuses the same resource.",
    parameters: pi.zod.object({
      action: pi.zod.enum(["inspect", "connect"]),
    }),
    async execute(_id, { action }) {
      if (action === "connect" && !connected) {
        const result = spawnSync("createdb", [database], { encoding: "utf8", timeout: 10000 });
        assert.equal(result.status, 0, result.error?.message ?? result.stderr);
        appendFileSync(envFile, `\nDATABASE_URL="postgresql://postgres@127.0.0.1:${process.env.PGPORT}/${database}"\n`);
        connected = true;
        appendFileSync(log, JSON.stringify({ event: "created", database, env_file: ".env.local" }) + "\n");
      }
      const result = {
        simulation: true, workspace: "hello-workspace", project: "hello-world",
        integration: "Prisma Postgres", connected,
        ...(connected ? { resource: database, env_file: ".env.local", variables: ["DATABASE_URL"] } : {}),
      };
      appendFileSync(log, JSON.stringify({ event: action, ...result }) + "\n");
      return { content: [{ type: "text", text: JSON.stringify(result) }], details: result };
    },
  });
}
