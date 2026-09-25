# Prisma ORM setup evals

The [OMP runner](../../evals/README.md) saves raw JSON and self-contained HTML reports, generated applications, verification logs, and token usage locally under ignored `eval-results/`.

Three planning cases check the ORM setup workflow directly:

| Case                                 | What it checks                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Existing ORM 8 with stale guidance   | Preserve a working app and load instructions matching its ORM library version, independently of the CLI version. |
| Prisma 7 client with CLI 8           | Detect the legacy application and route connection work to its existing-version guidance.                        |
| Provider support not yet established | Verify ORM 8 support before installation; preserve the user's database and report unsupported configurations.    |

Run all planning cases from the repository root:

```sh
npm run eval -- prisma-orm-setup/evals/evals.json \
  --model openai-codex/gpt-6-astra
```

The execution case builds a real Node application and verifies a query against disposable local PostgreSQL. It shares the Postgres setup suite's one-file fixture and independent verifier, but starts by loading `prisma-orm-setup` directly. This checks ORM setup independently from the Postgres skill's handoff.

Start a fresh local database using the [execution walkthrough](../../prisma-postgres-setup/evals/execution/README.md), then run:

```sh
npm run eval -- prisma-orm-setup/evals/execution/evals.json \
  --model openai-codex/gpt-6-astra --timeout 600
```

Set `DATABASE_URL` for the disposable database before running. Use a fresh database for each execution suite and stop it afterward. Reports include generated code, diffs, independent verification, model grading, and separate executor/judge token usage.

These are synthetic cases with explicit skill loading. They do not measure automatic skill selection, production migration safety, or support for every provider. No 7-to-8 application migration is executed; the legacy case checks preserving the existing version and handing off connection work.
