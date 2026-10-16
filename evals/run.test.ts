import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { EvalReport } from "./types.ts";

const runner = fileURLToPath(new URL("run.ts", import.meta.url));

// The CLI double emits OMP's public JSON event shapes, including duplicated snapshots.
const fakeOMP = `#!/usr/bin/env node
if (process.argv.includes('--version')) { console.log('18.3.0'); process.exit(0); }
const fs = await import('node:fs/promises');
const path = await import('node:path');
if (process.argv.includes('--export')) {
  if (process.env.EVAL_FAKE_OMP_MODE === 'export-error') { console.error('Export unavailable'); process.exit(1); }
  const session = process.argv[process.argv.indexOf('--export') + 1];
  await fs.writeFile('omp-session-' + path.basename(session, '.jsonl') + '.html', '<html>OMP native session</html>');
  process.exit(0);
}
if (process.env.EVAL_FAKE_WORKSPACES) await fs.appendFile(process.env.EVAL_FAKE_WORKSPACES, process.cwd() + '\\n');
const sessionDir = process.argv[process.argv.indexOf('--session-dir') + 1];
await fs.writeFile(path.join(sessionDir, 'test.jsonl'), JSON.stringify({type: 'session', id: 'test'}) + '\\n');
let prompt = ''; for await (const chunk of process.stdin) prompt += chunk;
const judge = process.argv.includes('--no-tools');
const execution = !judge && process.argv[process.argv.indexOf('--tools') + 1]?.split(',').includes('bash');
const mode = process.env.EVAL_FAKE_OMP_MODE;
if (process.argv.includes('--extension')) {
  if (process.env.DATABASE_URL) { console.error('Unexpected preconnected database'); process.exit(1); }
  const extension = process.argv[process.argv.indexOf('--extension') + 1];
  if (!(await fs.readFile(extension, 'utf8')).includes('fixture extension')) process.exit(1);
}
if (mode === 'timeout') { setInterval(() => {}, 1000); await new Promise(() => {}); }
if (mode === 'error' || (judge && mode === 'judge-error')) { console.error('Provider unavailable'); process.exit(1); }
const emit = event => console.log(JSON.stringify(event));
const usage = { input: 100, output: 10, cacheRead: 50, cacheWrite: 20, totalTokens: 180, reasoningTokens: 4 };
function assistant(text) { return { role: 'assistant', provider: 'test', model: 'test', stopReason: 'stop', content: [{ type: 'text', text }], ...(mode === 'missing-usage' ? {} : { usage }) }; }
if (!judge && mode !== 'no-read') {
  const first = assistant('Reading the supplied skill.');
  emit({ type: 'message_start', message: first });
  emit({ type: 'message_end', message: first });
  emit({ type: 'turn_end', message: first });
  emit({ type: 'tool_execution_start', toolCallId: 'read-1', toolName: mode === 'bad-tool' ? 'bash' : 'read', args: { path: '.agents/skills/demo/SKILL.md' } });
  emit({ type: 'tool_execution_end', toolCallId: 'read-1', isError: false, result: { content: [{ type: 'text', text: 'Use the existing database.' }] } });
}
if (!judge && mode === 'directory') {
  emit({ type: 'tool_execution_start', toolCallId: 'read-2', toolName: 'read', args: { path: '.agents/skills' } });
  emit({ type: 'tool_execution_end', toolCallId: 'read-2', isError: false, result: { content: [{ type: 'text', text: 'demo/' }] } });
}
if (!judge && process.argv.includes('--extension')) {
  await fs.writeFile('../integration.jsonl', JSON.stringify({ event: 'connected', simulation: true }) + '\\n');
  emit({ type: 'tool_execution_start', toolCallId: 'host-1', toolName: 'GetOrRequestIntegration', args: { action: 'connect' } });
  emit({ type: 'tool_execution_end', toolCallId: 'host-1', isError: false, result: { content: [{type: 'text', text: 'Connected local database'}] } });
}
if (!judge && execution) {
  const fs = await import('node:fs/promises');
  await fs.writeFile('project/index.ts', 'export const answer = 42; // </script><script>oops</script>');
  await fs.writeFile('project/.env', 'DO_NOT_CAPTURE=private-fixture-value');
  await fs.mkdir('project/.cursor/skills', { recursive: true });
  await fs.writeFile('project/.cursor/skills/SKILL.md', 'Installed guidance, not app output.');
  await fs.rm('project/obsolete.ts');
  await fs.writeFile('project/README.md', 'Generated application.');
  if (mode === 'symlink') await fs.symlink('../prompt.txt', 'project/escape.txt');
}
const payload = judge ? JSON.parse(prompt.slice(prompt.indexOf('\\n\\n{') + 2)) : null;
const text = judge ? (mode === 'malformed' ? 'not JSON' : JSON.stringify({ checks: payload.expectations.map((_, index) => ({ index: mode === 'duplicate' ? 0 : index, passed: mode !== 'failed', evidence: 'The answer proposes reusing the database.' })) })) : 'Reuse the existing database. </script><script>globalThis.pwned=true</script>';
const message = assistant(mode === 'unicode' && !judge ? 'Reuse café database.' : text);
if (mode === 'unicode' && !judge) {
  const encoded = Buffer.from(JSON.stringify({ type: 'message_end', message }) + '\\n');
  const split = encoded.indexOf(Buffer.from('é')) + 1;
  process.stdout.write(encoded.subarray(0, split));
  await new Promise(resolve => setTimeout(resolve, 10));
  process.stdout.write(encoded.subarray(split));
} else
emit({ type: 'message_end', message });
emit({ type: 'turn_end', message });
emit({ type: 'agent_end', messages: [message] });
`;

test("eval CLI records OMP usage, tool evidence, grading, and failure states", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "prisma-eval-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = join(root, "bin");
  const skills = join(root, "skills");
  await mkdir(bin);
  await writeFile(
    join(bin, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  await mkdir(join(skills, "demo"), { recursive: true });
  await writeFile(
    join(skills, "demo", "SKILL.md"),
    "---\nname: demo\ndescription: Test fixture\n---\nReuse existing resources.",
  );
  await writeFile(join(bin, "omp"), fakeOMP);
  await chmod(join(bin, "omp"), 0o755);
  const suitePath = join(root, "evals.json");
  const suite = {
    skill_name: "demo",
    evaluation_type: "planning",
    evals: [
      {
        id: 1,
        name: "Resource reuse",
        source: "Synthetic fixture",
        prompt: "Describe setup.",
        expected_output: "Reuse it.",
        expectations: ["Reuse database", "Keep existing packages"],
        files: [],
      },
    ],
  };
  await writeFile(suitePath, JSON.stringify(suite));
  let sequence = 0;
  async function run(mode = "pass", extra: string[] = [], existing?: string) {
    const out = existing ?? join(root, `run-${sequence++}`);
    const workspaceLog = join(root, "workspaces.txt");
    await writeFile(workspaceLog, "");
    const processResult = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        runner,
        suitePath,
        "--model",
        "test/test",
        "--skills-dir",
        skills,
        "--out",
        out,
        ...extra,
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          PATH: `${bin}:${dirname(process.execPath)}:${process.env.PATH}`,
          EVAL_FAKE_OMP_MODE: mode,
          EVAL_FAKE_WORKSPACES: workspaceLog,
        },
      },
    );
    assert.equal(processResult.error, undefined);
    const report = await readFile(join(out, "results.json"), "utf8")
      .then((text) => JSON.parse(text) as EvalReport)
      .catch(() => null);
    if (report) {
      assert.deepEqual((await readdir(out)).sort(), [
        "report.html",
        "results.json",
      ]);
      for (const workspace of (await readFile(workspaceLog, "utf8"))
        .split("\n")
        .filter(Boolean)) {
        assert.equal(
          await access(workspace).then(
            () => true,
            () => false,
          ),
          false,
          "Temporary execution workspace should be removed",
        );
      }
    }
    return { ...processResult, out, report };
  }
  await t.test(
    "counts completed messages once and escapes report content",
    async () => {
      const result = await run();
      assert.equal(result.status, 0, result.stderr);
      const report = result.report!;
      assert.deepEqual(report.results[0].executor.tokens, {
        input: 200,
        output: 20,
        cache_read: 100,
        cache_write: 40,
        total: 360,
      });
      assert.equal(report.results[0].judge?.tokens?.total, 180);
      assert.equal(report.results[0].executor.model_calls, 2);
      assert.equal(report.results[0].executor.tool_calls.length, 1);
      assert.equal(report.results[0].executor.tool_calls[0].is_error, false);
      assert.equal(report.results[0].checks.length, 2);
      const html = await readFile(join(result.out, "report.html"), "utf8");
      assert.ok(
        html.includes("&lt;/script&gt;&lt;script&gt;globalThis.pwned=true"),
      );
      assert.ok(!html.includes("<script>globalThis.pwned=true"));
      assert.ok(html.includes('id="status"'));
      assert.match(html, /Tokens used in this case/);
      assert.match(html, /OMP agent session/);
      assert.match(html, /OMP judge session/);
      assert.match(
        report.results[0].executor.session_html!,
        /OMP native session/,
      );
      assert.match(
        report.results[0].executor.session_jsonl!,
        /"type":"session"/,
      );
      assert.match(report.results[0].executor.prompt, /Describe setup/);
      assert.match(report.results[0].judge!.prompt, /Reuse database/);
      assert.equal(report.results[0].executor.evidence.length, 3);
      const embedded = html.match(
        /<script type="application\/json" id="report-data">([\s\S]*?)<\/script>/,
      )![1];
      assert.deepEqual(JSON.parse(embedded), report);
      assert.ok(!/href="(?:case-|results\.json|report\.md)/.test(html));
      const retry = await run("pass", [], result.out);
      assert.equal(retry.status, 2);
      assert.match(retry.stderr, /EEXIST/);
      assert.equal(retry.report?.started_at, report.started_at);
    },
  );
  await t.test(
    "export failures are visible without discarding a completed eval",
    async () => {
      const result = await run("export-error");
      assert.equal(result.status, 0);
      assert.match(
        result.report!.results[0].executor.export_error!,
        /Export unavailable/,
      );
      const html = await readFile(join(result.out, "report.html"), "utf8");
      assert.match(html, /OMP export unavailable/);
      assert.ok(!html.includes("executor/session.html"));
    },
  );
  await t.test("reading the supplied skill directory is allowed", async () => {
    const result = await run("directory");
    assert.equal(
      result.status,
      0,
      result.report?.results[0].error ?? result.stderr,
    );
    assert.equal(result.report?.results[0].executor.tool_calls.length, 2);
  });
  await t.test(
    "preserves UTF-8 when a character spans stream chunks",
    async () => {
      const result = await run("unicode");
      assert.equal(
        result.status,
        0,
        result.report?.results[0].error ?? result.stderr,
      );
      assert.equal(
        result.report?.results[0].executor.response,
        "Reuse café database.",
      );
    },
  );
  await t.test("failed rubric checks return exit 1", async () => {
    const result = await run("failed");
    assert.equal(result.status, 1);
    assert.equal(result.report?.results[0].status, "failed");
  });
  for (const mode of [
    "malformed",
    "duplicate",
    "error",
    "judge-error",
    "bad-tool",
    "no-read",
    "timeout",
  ]) {
    await t.test(`${mode} is an error, not a failed skill`, async () => {
      const result = await run(
        mode,
        mode === "timeout" ? ["--timeout", "0.3"] : [],
      );
      assert.equal(result.status, 2, result.stderr);
      assert.equal(result.report?.results[0].status, "error");
      assert.equal(result.report?.results[0].checks.length, 0);
      assert.ok(result.report?.results[0].error);
      assert.ok(
        (await readFile(join(result.out, "report.html"), "utf8")).includes(
          "Run could not be graded",
        ),
      );
    });
  }
  await t.test(
    "missing usage remains unavailable without failing behavior",
    async () => {
      const result = await run("missing-usage");
      assert.equal(result.status, 0);
      assert.equal(result.report?.results[0].executor.tokens, null);
      assert.match(
        await readFile(join(result.out, "report.html"), "utf8"),
        /Incomplete usage data/,
      );
    },
  );
  await t.test(
    "case filtering rejects unknown cases before calling OMP",
    async () => {
      const result = await run("error", ["--case", "999"]);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /No case matched/);
      assert.equal(result.report, null);
    },
  );
  await t.test(
    "execution captures created, modified, and deleted files and runs independent verification",
    async () => {
      const fixture = join(skills, "demo", "fixture");
      await mkdir(fixture);
      await writeFile(join(fixture, "index.ts"), "export const answer = 0;");
      await writeFile(join(fixture, "obsolete.ts"), "// removed");
      const verify = join(skills, "demo", "verify.mjs");
      await writeFile(
        verify,
        "import { readFileSync } from 'node:fs'; import assert from 'node:assert/strict'; assert.match(readFileSync('index.ts', 'utf8'), /answer = 42/); console.log('Verified generated file');",
      );
      const executionSuite = {
        ...suite,
        evaluation_type: "execution",
        evals: [
          {
            ...suite.evals[0],
            fixture: "demo/fixture",
            verify: "demo/verify.mjs",
          },
        ],
      };
      await writeFile(suitePath, JSON.stringify(executionSuite));
      const result = await run();
      assert.equal(
        result.status,
        0,
        result.report?.results[0].error ?? result.stderr,
      );
      const output = result.report!.results[0].output!;
      assert.equal(output.verification.exit_code, 0);
      assert.match(output.verification.output, /Verified generated file/);
      assert.equal(output.files.length, 3);
      assert.equal(
        output.files.find((file) => file.path === "README.md")?.before,
        null,
      );
      const changed = output.files.find((file) => file.path === "index.ts")!;
      assert.equal(changed.before, "export const answer = 0;");
      assert.match(changed.after!, /answer = 42/);
      assert.match(changed.diff, /-export const answer = 0/);
      assert.equal(
        output.files.find((file) => file.path === "obsolete.ts")?.after,
        null,
      );
      const html = await readFile(join(result.out, "report.html"), "utf8");
      assert.match(html, /Generated project/);
      assert.ok(
        html.indexOf("<h3>Generated project") < html.indexOf("<h3>Assessment"),
      );
      assert.ok(!html.includes("<script>oops</script>"));
      assert.ok(!JSON.stringify(output).includes("private-fixture-value"));

      await writeFile(join(skills, "demo/host.mjs"), "// fixture extension");
      const hostSuite = {
        ...executionSuite,
        evals: [
          {
            ...executionSuite.evals[0],
            host: {
              extension: "demo/host.mjs",
              tools: ["GetOrRequestIntegration"],
              context: "No database is connected.",
            },
          },
        ],
      };
      await writeFile(suitePath, JSON.stringify(hostSuite));
      const previousUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "must-not-reach-host-executor";
      const hosted = await run();
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
      assert.equal(
        hosted.status,
        0,
        hosted.report?.results[0].error ?? hosted.stderr,
      );
      assert.equal(
        hosted.report!.results[0].executor.tool_calls[1].name,
        "GetOrRequestIntegration",
      );
      assert.match(hosted.report!.results[0].host_log!, /"event":"connected"/);
      const hostPrompt = hosted.report!.results[0].executor.prompt;
      assert.match(hostPrompt, /No database is connected/);
      assert.ok(!hostPrompt.includes("DATABASE_URL is supplied"));
      await writeFile(suitePath, JSON.stringify(executionSuite));

      await writeFile(
        verify,
        "console.error('Generated code fails'); process.exit(1);",
      );
      const failed = await run();
      assert.equal(failed.status, 1);
      assert.equal(failed.report?.results[0].status, "failed");
      assert.ok(
        failed.report?.results[0].checks.every((check) => check.passed),
      );
      assert.equal(failed.report?.results[0].output?.verification.exit_code, 1);

      const symlink = await run("symlink");
      assert.equal(symlink.status, 2);
      assert.match(symlink.report!.results[0].error!, /symlinks/);
      await writeFile(suitePath, JSON.stringify(suite));
    },
  );
  await t.test("fixtures cannot escape their skill directory", async () => {
    await writeFile(
      suitePath,
      JSON.stringify({
        ...suite,
        evals: [{ ...suite.evals[0], files: ["../private.txt"] }],
      }),
    );
    const result = await run();
    assert.equal(result.status, 2);
    assert.match(result.stderr, /relative paths inside/);
  });
  await t.test(
    "host extensions cannot escape the collection or enable arbitrary built-in tools",
    async () => {
      for (const host of [
        {
          extension: "../escape.mjs",
          tools: ["GetOrRequestIntegration"],
          context: "local",
        },
        { extension: "host.mjs", tools: ["bash"], context: "local" },
      ]) {
        await writeFile(
          suitePath,
          JSON.stringify({
            ...suite,
            evaluation_type: "execution",
            evals: [
              {
                ...suite.evals[0],
                fixture: "demo/fixture",
                verify: "demo/verify.mjs",
                host,
              },
            ],
          }),
        );
        const result = await run();
        assert.equal(result.status, 2);
        assert.match(result.stderr, /host needs/);
      }
    },
  );
  await t.test("duplicate case IDs are rejected", async () => {
    await writeFile(
      suitePath,
      JSON.stringify({ ...suite, evals: [suite.evals[0], suite.evals[0]] }),
    );
    const result = await run();
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unique positive integer/);
  });
});
