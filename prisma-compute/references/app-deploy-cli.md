# Prisma Platform CLI App Deploy

Use this reference for existing projects and for generated `compute:deploy` scripts.

## Package and Command

Current Compute app workflows are exposed through the Prisma Platform CLI package:

```bash
bunx @prisma/cli@latest --help
bunx @prisma/cli@latest app --help
bunx @prisma/cli@latest app deploy --help
```

The examples in help output may call the binary `prisma-cli`. When using package runners, prefer:

```bash
bunx @prisma/cli@latest app deploy
npx @prisma/cli@latest app deploy
pnpm dlx @prisma/cli@latest app deploy
```

If a future Prisma ORM CLI exposes `prisma app deploy`, use the local project command after verifying `prisma app deploy --help`.

## Typed Compute Config

`prisma.compute.ts` is optional for normal single-app deploys and useful for reusable defaults or multi-app targets. Read [`compute-config.md`](compute-config.md) for config shapes, target selection, precedence, and monorepo rules. This reference only shows how deploy commands consume those settings.

## Auth and Project Binding

Useful commands:

```bash
bunx @prisma/cli@latest auth login
bunx @prisma/cli@latest auth whoami
bunx @prisma/cli@latest project list --json
bunx @prisma/cli@latest project show
bunx @prisma/cli@latest project link <project-id-or-name>
bunx @prisma/cli@latest project create my-app
```

For a new linked project:

```bash
bunx @prisma/cli@latest project create my-app --json
```

For non-interactive or CI work, current `@prisma/cli` accepts a workspace service token through `PRISMA_SERVICE_TOKEN` before falling back to stored browser-login credentials. Verify auth with `auth whoami` and never print the token value.

## Project, Branch, Database, and Env Scope

Compute deploys resolve a target project, app, and branch. Be explicit when the user's intent is not the already linked default project/app:

```bash
bunx @prisma/cli@latest project show --json
bunx @prisma/cli@latest app deploy --project proj_123 --app my-api --branch feature/login --json
```

If `prisma.compute.ts` defines a `name` or an `apps` key, that config can provide the app name. `--app` and `PRISMA_APP_ID` rank above the config value. `[app]` selects a target from `apps` when the installed CLI supports typed compute config:

```bash
bunx @prisma/cli@latest app deploy api --project proj_123 --branch feature/login --json
```

See [`compute-config.md`](compute-config.md) for no-argument target inference, deploy-all, and build/run target rules.

Branch scope must line up across deploys, databases, and env vars:

- `app deploy --branch <git-name>` creates a deployment for that branch.
- `database create <name> --branch <git-name>` creates a Prisma Postgres database for that branch scope.
- `project env add/list/remove --branch <git-name>` manages branch-specific env overrides.
- `project env add/list/remove --role production` manages production env.
- `project env add/list/remove --role preview` manages preview-template env.

Do not assume a local Git branch was used by the CLI unless the generated script or command output says so. If a user asks for `feature/login`, pass `--branch feature/login` consistently to app, database, and env commands.

Promotion is a separate production action: `app promote <deployment-id>` rebuilds a deployment with production env vars. Do not treat a preview branch deploy as production promotion.

The current `app show`, `app list-deploys`, and `app logs` help exposes `--app`, `--project`, and for logs `--deployment`, not `--branch`. For branch debugging, capture the deployment id from deploy JSON and inspect that deployment or its logs.

`app deploy --create-project <name>` creates and links a new Project before deploying. Use it only when the user wants a new Project. It conflicts with `--project` and `PRISMA_PROJECT_ID`, and `--yes` alone does not choose Project scope.

## Database and Env

Create a Prisma Postgres database for the linked project:

```bash
bunx @prisma/cli@latest database create main --branch main --json
```

Manage project env vars:

```bash
bunx @prisma/cli@latest project env list
bunx @prisma/cli@latest project env add --file .env --role production
bunx @prisma/cli@latest project env add --file .env.preview --role preview
bunx @prisma/cli@latest project env add DATABASE_URL=postgresql://... --branch feature/foo
bunx @prisma/cli@latest project env list --branch feature/foo
bunx @prisma/cli@latest project env remove STRIPE_KEY --role preview
```

`app deploy --env .env` loads environment variables from a file for the deployment. A config-backed deploy can instead load env through `prisma.compute.ts` `env`. Neither path is a migration command or seed command.

If the deploy should create and wire a Prisma Postgres database for the deploy target, current `app deploy` exposes `--db`; use `--no-db` to skip database setup. Treat any generated connection URL as a one-time secret.

Database setup is not part of `prisma.compute.ts` in the current beta. Keep database intent explicit with `--db`, `--no-db`, `database create`, and project env commands.

Database setup guardrails:

- `--db` and `--no-db` are mutually exclusive.
- `--yes` alone never creates a database; CI must pass `--db --yes`.
- `--db` creates and wires one branch database. In deploy-all, every target on that branch shares it.
- `--db` does not run migrations, seed data, or schema push. Run the app's own Prisma database command after deploy setup when needed.
- Database env values supplied through `--env DATABASE_URL=...`, `--env DIRECT_URL=...`, or an env file suppress automatic database prompting; combining those values with `--db` is rejected.
- Known non-PostgreSQL Prisma schema sources do not trigger database prompting; explicit `--db` is rejected because it creates Prisma Postgres.

## Build and Run Locally

Before deploy, verify that the app can produce a Compute artifact:

```bash
bunx @prisma/cli@latest app build --build-type auto
bunx @prisma/cli@latest app run --build-type auto --port 3000
```

For Bun/server entrypoints:

```bash
bunx @prisma/cli@latest app build --build-type bun --entry src/index.ts
bunx @prisma/cli@latest app run --build-type bun --entry src/index.ts --port 8080
```

With a compute config, pass the target name instead of repeating framework/entry/port flags:

```bash
bunx @prisma/cli@latest app build api
bunx @prisma/cli@latest app run api --port 8080
```

`app run --port` sets `PORT` for local development. It does not rewrite an app's explicit host binding, so a local run is not enough to prove the deployed server is reachable from ingress.

## Deploy

Deploy with prompts:

```bash
bunx @prisma/cli@latest app deploy
```

Agent/script-friendly deploy:

```bash
bunx @prisma/cli@latest app deploy \
  --json \
  --no-interactive \
  --prod \
  --yes \
  --env .env
```

For preview branches, omit `--prod` unless the user explicitly intends a production deploy:

```bash
bunx @prisma/cli@latest app deploy \
  --branch feature/foo \
  --json \
  --no-interactive \
  --env .env.preview
```

After a real deploy, verify the public deployment URL. Do not stop at "deploy succeeded" or a local `app run` check:

```bash
node prisma-compute/scripts/smoke-deployed-app.mjs https://<deployment-url>
```

If the deploy command returns JSON, parse the URL from the result and smoke-test that exact URL. Use `--expect <text>` when the app has a stable health response or page marker. The smoke script rejects `localhost` and `127.0.0.1` by default so agents do not accidentally test a local server instead of public ingress.

Create/link a project during deploy:

```bash
bunx @prisma/cli@latest app deploy \
  --create-project my-app \
  --prod \
  --yes \
  --env .env
```

Deploy with framework and port:

```bash
bunx @prisma/cli@latest app deploy \
  --framework hono \
  --http-port 8080 \
  --prod \
  --yes \
  --env .env
```

Deploy a preview branch with framework and port:

```bash
bunx @prisma/cli@latest app deploy \
  --framework hono \
  --branch feature/foo \
  --http-port 8080 \
  --json \
  --no-interactive \
  --env .env.preview
```

Bun-style app with explicit entrypoint:

```bash
bunx @prisma/cli@latest app deploy \
  --framework bun \
  --entry src/index.ts \
  --http-port 8080 \
  --prod \
  --yes \
  --env .env
```

`--entry <path>` without `--framework` is treated as a Bun app deploy by the current CLI.

Config-backed Bun-style app:

```bash
bunx @prisma/cli@latest app deploy api --prod --yes --env .env
```

Use config for stable app defaults, and flags for one-off project, branch, env, database, and production choices.

## Operations

Inspect and open:

```bash
bunx @prisma/cli@latest app show --json
bunx @prisma/cli@latest app open
```

Deployments:

```bash
bunx @prisma/cli@latest app list-deploys --json
bunx @prisma/cli@latest app show-deploy <deployment-id> --json
bunx @prisma/cli@latest app promote <deployment-id> --yes
bunx @prisma/cli@latest app rollback --to <deployment-id> --yes
bunx @prisma/cli@latest app remove --app my-api --yes
```

Logs:

```bash
bunx @prisma/cli@latest app logs
bunx @prisma/cli@latest app logs --deployment <deployment-id>
bunx @prisma/cli@latest app logs --json
```

Domains:

```bash
bunx @prisma/cli@latest app domain add shop.example.com
bunx @prisma/cli@latest app domain show shop.example.com
bunx @prisma/cli@latest app domain wait shop.example.com --timeout 15m
bunx @prisma/cli@latest app domain retry shop.example.com
bunx @prisma/cli@latest app domain remove shop.example.com
```

Custom domain commands target production branch runtime during the current beta. Do not use a preview branch for production domain setup.

## Output Handling

When `--json` is available, parse the JSON and summarize:

- project id/name
- branch name
- app id/name
- deployment id/status
- deployment URL
- database id/name if one was created

Do not print secret env var values.
