import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const url = new URL(process.env.DATABASE_URL ?? "");
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
  "This verifier requires disposable local PostgreSQL.",
);
assert.equal(
  url.pathname,
  "/prisma_skill_eval",
  "Use a dedicated prisma_skill_eval database.",
);
const installed = JSON.parse(
  readFileSync("node_modules/@prisma/orm-postgres/package.json", "utf8"),
);
assert.match(installed.version, /^8\./);
console.log(`Installed ORM: ${installed.version}`);

const types = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  { encoding: "utf8", timeout: 30000 },
);
console.log(types.stdout, types.stderr);
assert.equal(types.status, 0, "Generated app must type-check.");
console.log("PASS: generated application type-checks");

const id = randomInt(1, 1_000_000_000);
const body = `eval-${randomUUID()}`;
const psql = process.env.PRISMA_EVAL_PSQL ?? "psql";
function sql(statement) {
  const result = spawnSync(
    psql,
    [
      "-X",
      "-d",
      process.env.DATABASE_URL,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    {
      env: process.env,
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
}

sql(`INSERT INTO "EvalNote" (id, body) VALUES (${id}, '${body}')`);
try {
  const probe = `
    import assert from 'node:assert/strict';
    const app = await import(${JSON.stringify(pathToFileURL(resolve("src/index.ts")).href)});
    try {
      assert.deepEqual(await app.readNote(${id}), { id: ${id}, body: ${JSON.stringify(body)} });
      assert.equal(await app.readNote(-1), null);
      console.log('PASS: generated ORM query reads the independent probe row and returns null for a missing row');
    } finally { await app.close(); }
  `;
  const query = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { encoding: "utf8", timeout: 30000 },
  );
  console.log(query.stdout, query.stderr);
  assert.equal(
    query.status,
    0,
    "Generated ORM query must return the independent probe row.",
  );
} finally {
  sql(`DELETE FROM "EvalNote" WHERE id = ${id}`);
}
