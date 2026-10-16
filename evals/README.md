# Skill evals with OMP

A small local runner: `evals.json` → OMP execution → independent OMP judge → raw JSON and self-contained HTML reports. No evaluation service, runtime npm dependencies, or CI integration.

## First run

Install Node.js 22.18+ (24 recommended) and [OMP](https://github.com/can1357/oh-my-pi). Authenticate OMP with `omp login`, then choose an exact provider/model from `omp models`. The runner was developed against OMP 18.3.0.

From this repository:

```sh
npm run eval -- prisma-postgres-setup/evals/evals.json \
  --model openai-codex/gpt-6-astra \
  --case 1 \
  --out eval-results/first-run
```

Use a model your account supports. Omit `--case 1` to run both cases. Open `eval-results/first-run/report.html` in a browser; `results.json` contains the raw run data, including prompts, tool calls, token usage, native OMP sessions, and generated code. The output directory must be new, so a rerun cannot overwrite evidence.

OMP makes paid or subscription-backed model calls for both execution and judging. It uses your existing OMP authentication. The npm development dependencies are needed only to format, type-check, and test the runner.

Prisma Postgres has two planning cases; Prisma ORM has three. Each also has an execution case using an existing connection. Prisma Postgres also has a [Hello World case with no connected database](../prisma-postgres-setup/evals/v0-hello-world/README.md). See the [Prisma ORM suite](../prisma-orm-setup/evals/README.md) for direct ORM coverage.

## What happens

1. Copy the supplied skill collection and case fixtures into a fresh case directory. Exclude each skill's `evals/` directory, so the executor does not receive the checklist.
2. Start a fresh OMP process. Explicitly request the target skill. Planning cases get `read`; execution cases get `read`, `write`, `edit`, and `bash` to build the fixture project.
3. Save OMP's JSON event stream, final answer, and completed tool calls. For execution cases, also capture changed project files and diffs, then run the case's independent verifier.
4. Start another OMP process with no tools. Give it the task, checklist, answer, and a compact transcript of assistant text and completed tool calls. Require a pass/fail judgment and quoted evidence for every expectation.
5. Validate the judge's JSON and write `results.json` and `report.html`. A case passes only if every expectation passes and any independent execution verification exits successfully. Save reports after each case.

The judge is another model session, not an objective oracle. Read its evidence, especially for surprising passes or failures. Missing, duplicated, or malformed grades are runner errors, not passes. A timeout or provider failure also stays separate from a failed skill check.

## Input

Start with a **planning** evaluation:

```json
{
  "skill_name": "prisma-postgres-setup",
  "evaluation_type": "planning",
  "evals": [
    {
      "id": 1,
      "name": "reuse-existing-database",
      "source": "Synthetic requirement check",
      "prompt": "Describe how you would connect to the database already attached to this app.",
      "expected_output": "Reuse the intended resource.",
      "expectations": ["Does not propose creating a replacement database."],
      "files": []
    }
  ]
}
```

`source` records whether the case came from an observed interaction or an assumption. `files` lists optional fixture files relative to the skill directory; the runner copies them under `inputs/`. Use synthetic values. Reports retain supplied content and model outputs, so do not put credentials or private customer data in fixtures.

Only the prompt, fixture paths, and supplied skill files are exposed to the executor. Expected output and expectations go to the judge. Each case needs a unique positive integer ID and at least one expectation.

For an **execution** suite, set `evaluation_type` to `execution` and add `fixture` (a project directory) and `verify` (a standalone Node `.mjs` script) to each case. Both execution paths are relative to the skill collection root, so suites can share the same fixture and verifier. The runner copies the fixture to `executor/project/`, lets OMP build it, and then runs a saved copy of the verifier with that project as its working directory. A nonzero verification exit fails the case even if the judge approves. The verifier receives no model access and consumes no model tokens. See the [single Node app example](../prisma-postgres-setup/evals/execution/README.md).

## Token measurements

The reports show execution and judging separately, for each case and the whole run:

- Uncached input tokens.
- Output tokens.
- Cache-read and cache-write tokens.
- Total tokens, model calls, tool calls, and elapsed time.

Usage comes from OMP's normalized `message_end.message.usage`, summed once for each assistant message. Streaming updates, `turn_end`, and `agent_end` repeat data and are not counted again. Reasoning tokens are not added separately to output. Tool result text becomes input to later model calls; it is not a separate token category to add again.

Missing usage stays **unavailable**. An incomplete run may still have recorded usage; its error status must be considered alongside that count. These are provider-reported token totals, not a billing reconciliation or a measurement of skill text alone. Retries are disabled; tokens for a request that fails before reporting usage cannot be recovered.

To compare a skill edit:

1. Run the same suite against the old collection with `--skills-dir path/to/baseline` and a fresh output directory.
2. Run against the edited collection with the same model and `--thinking` level.
3. Compare pass/fail results first, then execution tokens. Keep judge usage separate: it includes the answer and evidence and may change for reasons unrelated to skill efficiency.
4. Repeat before claiming an improvement. Keep OMP version and harness settings unchanged; cache behavior and model variability affect results.

`results.json` records requested and observed models, thinking level, OMP version, and hashes of the suite, skill snapshot, and harness. No automatic optimizer, confidence interval, or benchmark claim is built into this starter.

## Options and outputs

| Option                         | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `--model provider/model`       | Required execution model.                                            |
| `--judge-model provider/model` | Judge model; defaults to execution model.                            |
| `--thinking low`               | Thinking level for both sessions; default `low`.                     |
| `--case 1`                     | Run one case.                                                        |
| `--skills-dir path`            | Skill collection; defaults to this repository.                       |
| `--out path`                   | New output directory; defaults to a timestamp under `eval-results/`. |
| `--timeout 180`                | Seconds allowed for each execution or judge process.                 |

Each completed run retains exactly two files:

- **`results.json`**: the raw report, including run settings and fingerprints, case definitions, exact executor/judge prompts, responses, tool evidence, raw OMP events, diagnostics, token usage, saved native sessions, and native HTML exports.
- **`report.html`**: a self-contained viewer with the same data embedded. It works when copied or uploaded by itself. Open prompts and tool logs within the report; download the raw JSON or native OMP exports from its buttons.

Execution results include generated source contents, before/after diffs, and independent verification output. Host cases also retain the integration log. The runner uses a temporary directory for the project, dependencies, skill copies, and OMP files, then removes it after saving the reports, including reported eval failures. An unexpected error that prevents packaging retains the temporary evidence and prints its location.

Generated source capture excludes dependency/build directories, agent state, and `.env` files other than `.env.example`; supported source files are text, at most 500 KB each and 5 MB per project. Prompts, tool output, and native sessions are not secret-redacted: review the report before posting it.

Optional execution `host` configuration supplies a collection-relative `.mjs` OMP extension, the allowed custom `tools`, and visible environment `context`. The runner snapshots the extension, enables it only for the executor, and clears inherited `DATABASE_URL` so acquisition cases start disconnected. The host fixture is trusted code and is included in the suite fingerprint. See the Hello World case for the single local simulation.

Each case detail starts with executor, judge, and combined token totals, plus a breakdown of uncached input, output, cached tokens, calls, and time. Native-export errors remain visible as artifact errors; they do not turn a completed skill evaluation into a failed skill.

The HTML report uses no network resources or neighboring files. Filter by result, search case content, expand assessments, and inspect individual tool calls.

Exit codes: **0** all cases passed; **1** one or more failed checks; **2** configuration, execution, or grading error. Invalid input fails before a report can be created.

## Saving and sharing results

Commit skills, eval definitions, starting fixtures, the runner, judge instructions, and verification scripts. Keep generated runs under the ignored `eval-results/` directory. Use `--out eval-results/<run-name>` to name a run, or omit `--out` for a timestamp.

The two report files are local output; sessions, tool logs, and generated source are embedded within them. Do not force-add them to Git or copy them into documentation directories. The legacy `docs/eval-runs/` location is also ignored.

Post `report.html` for people to read, or `results.json` for programmatic analysis. Either file carries the evidence and metadata needed to inspect the run. A fresh clone contains the inputs and runner, not past run results.

## Scope and controls

This tests behavior **after explicitly loading a skill**. Planning cases assess proposed actions. The execution cases test package installation, generated code, type checking, and a real query against disposable local PostgreSQL. Neither suite tests automatic skill discovery, cloud provisioning, or v0 distribution. These are small development examples, not a representative customer dataset.

`omp.json` disables known configuration discovery sources, MCP configuration, memory, retries, compaction, and background advising. CLI flags disable inherited skills, rules, discovered extensions, and title generation. An execution case may explicitly enable its saved host extension; the judge receives none. A fixed system template keeps inherited project instructions out of the prompt. The executor gets the tools listed above and any declared host tools; the judge gets no tools. Unexpected tool events cause an error after the run, not a security block before a call.

These controls are not an operating-system sandbox. Execution uses your local user permissions, can install packages and run shell commands, and inherits the environment. Run only trusted suites and skills with synthetic data and disposable local resources; use an external sandbox for untrusted content. Never supply production credentials. Changes to OMP's discovery or event formats need revalidation.

## Working on the runner

```sh
npm ci --ignore-scripts
npm run format
npm run check:types
npm test
```

`run.ts` owns execution and grading. `report.ts` renders both reports from saved results; it makes no model calls. `types.ts` is their shared data contract. The CLI tests use a fake OMP executable to verify token arithmetic, repeated event snapshots, missing usage, malformed grading, failures, timeouts, input validation, HTML escaping, generated-file diffs, and verification failure precedence. Those tests do not establish model quality; real OMP runs do that for the supplied cases.

References: [OMP programmatic usage and HTML export](https://github.com/can1357/oh-my-pi#programmatic-usage), [OMP settings](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md).

## Version-routing regressions

The restored database guidance has two small planning cases for existing MySQL/Prisma 7 and MongoDB/Prisma 6 apps. The CLI case checks that loading its Prisma 7 reference first still routes default new setup to Prisma 8.

```sh
npm run eval -- prisma-database-setup/evals/evals.json --model openai-codex/gpt-6-astra
npm run eval -- prisma-cli/evals/evals.json --model openai-codex/gpt-6-astra
```

These check behavior after explicitly loading the named skill, not automatic skill discovery.
