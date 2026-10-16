# One execution eval: a working Node app

This case asks OMP to build a tiny application. The starting fixture is one `package.json`; the agent creates the ORM setup and application code. It uses disposable local PostgreSQL as a stand-in for an already connected Prisma Postgres database. Cloud provisioning and v0 are outside this case.

The report shows:

- Every changed source file, its final contents, and its diff.
- An independent verification log, separate from what the agent claims.
- The final response, actual tool calls, and execution/judge token usage.

## Run it

Use Node 24.11+ and an authenticated OMP installation. Install PostgreSQL locally and put `initdb`, `pg_ctl`, `createdb`, and `psql` on your PATH. These commands create a fresh cluster in a temporary directory and bind it to localhost. Choose a free port if 55439 is occupied.

```sh
cluster=$(mktemp -d)
initdb -D "$cluster" -U postgres -A trust --no-locale -E UTF8
pg_ctl -D "$cluster" -l "$cluster/server.log" -o '-h 127.0.0.1 -p 55439' -w start
createdb -h 127.0.0.1 -p 55439 -U postgres prisma_skill_eval

DATABASE_URL=postgresql://postgres@127.0.0.1:55439/prisma_skill_eval \
  npm run eval -- prisma-postgres-setup/evals/execution/evals.json \
  --model openai-codex/gpt-6-astra --timeout 600 \
  --out eval-results/node-app

pg_ctl -D "$cluster" -m fast -w stop
```

Stop the cluster even if the eval fails. Each run should use a fresh cluster and output directory. `PRISMA_EVAL_PSQL` can point to the `psql` executable if it is not on PATH. No password or cloud credentials are needed. Use only trusted evals: the agent can run shell commands with your user permissions.

Open `eval-results/node-app/report.html`. The case opens automatically, with **Generated project** first. Expand a file to see its final contents; choose **Show diff** to compare it with the fixture. Generated source and diffs are embedded in `report.html` and `results.json`. The temporary project and dependencies are removed after the reports are saved. Source capture excludes dependencies, build output, agent state, and local environment files.

## How verification works

The shared [`verify.mjs`](../../../evals/fixtures/node-postgres/verify.mjs) is maintained with the evals, not written by the agent. Both setup skills use the same fixture and verification contract. The runner snapshots it before execution and writes the copy outside the project after the agent finishes.

The verifier checks that the installed ORM is version 8 and runs the installed TypeScript compiler. It then inserts a random probe row directly with `psql`, calls the generated `readNote` function, checks the returned row and a missing-row result, and removes the probe row. The unpredictable value tests whether the generated function actually queries the database. All database operations are limited to the dedicated local database in the example.

A nonzero verifier exit fails the case even if every model-judged expectation passes. The judge also receives generated source files and the verification output, alongside tool evidence. It does not receive lockfile contents. The full lockfile is retained in the raw report and HTML.

This is one synthetic case, not an estimate of production reliability. It exercises the existing-connection path and Prisma ORM handoff. It does not test creating a cloud database, actual Prisma Postgres infrastructure, automatic skill selection, or a UI preview.
