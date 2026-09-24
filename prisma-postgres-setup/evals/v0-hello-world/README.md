# Hello World, no database connected

User prompt: **Add prisma database to my hello world app**

This execution case starts with a small Next.js app and no database or connection string. Its existing readiness endpoint must check configured services. The agent receives the Postgres setup skill and a simulated host tool, `GetOrRequestIntegration`. Calling `connect` creates one database in a disposable local PostgreSQL cluster and injects `.env.local`; a second call reuses it. The tool preserves unrelated environment settings. The fixture’s tracked `.env.local` contains only the nonsecret Hello World greeting; no connection string or credential is stored in the fixture. OMP reloads home dotenv files, so the host clears any ambient connection before the agent starts.

This is a local simulation of the v0 workflow, not Vercel's API contract or a live Marketplace integration. Installation consent is preauthorized in the simulated host. It does not test v0 skill distribution or automatic skill discovery. The prompt contains no package version, model, or implementation instructions; project requirements live in the fixture README and grading expectations stay hidden.

## Run

Use Node 24.11+, OMP 18.3.0 with an authenticated model, and PostgreSQL's `initdb`, `pg_ctl`, `createdb`, and `psql` on PATH. From the repository root, with a free port 55443:

```sh
(
  set -e
  export PGHOST=127.0.0.1 PGPORT=55443 PGUSER=postgres
  export NEXT_TELEMETRY_DISABLED=1
  unset DATABASE_URL PGDATABASE
  eval_cluster=$(mktemp -d)
  trap 'pg_ctl -D "$eval_cluster" -m fast -w stop >/dev/null 2>&1 || true' EXIT
  initdb -D "$eval_cluster" -U postgres -A trust --no-locale -E UTF8
  pg_ctl -D "$eval_cluster" -l "$eval_cluster/server.log" \
    -o "-h 127.0.0.1 -p $PGPORT -k $eval_cluster" -w start
  npm run eval -- prisma-postgres-setup/evals/v0-hello-world/evals.json \
    --model openai-codex/gpt-6-astra --thinking low --timeout 900
)
```

Do not create an application database in advance. The host tool creates it only on request. Stop the temporary cluster after the run, including failures. Use only trusted skills and fixtures: OMP executes code with local user permissions.

## Evidence

Open the HTML path printed by the runner. Each case shows executor/judge token totals at the top, a usage breakdown, generated files and diffs, verification, and tool arguments/results. Prompts, raw JSON events, and grading evidence open inside the report. Native OMP exports for both sessions can be downloaded from the embedded data. `results.json` also includes the original session JSONL. Export failures are reported separately without inventing an artifact or changing a model assessment.

The raw report’s `host_log` field records the disconnected starting state and provisioning calls. The independent verifier checks one database was acquired, environment preservation, ORM 8, application build/types, the Hello World homepage, and readiness under a real database outage followed by recovery. It blocks connections only to the database created for this case, then restores access and stops its app server in cleanup.

Each run keeps only `results.json` and a self-contained `report.html` under ignored `eval-results/`. Temporary projects and logs are removed after their evidence is captured. Both reports include native sessions and tool output; review them before posting because they are not automatically secret-redacted.
