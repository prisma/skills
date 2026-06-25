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
```

Current `@prisma/cli` can keep multiple local browser-login workspace sessions. Running `auth login` again for a different workspace should add/update that workspace session and make it active; it should not delete the existing workspace session. The active workspace pointer decides which stored OAuth workspace normal commands use.

For agents, prefer this flow before project/app mutations:

```bash
bunx @prisma/cli@latest auth whoami --json
bunx @prisma/cli@latest auth workspace list --json
bunx @prisma/cli@latest auth workspace use <workspace-id>
```

Use workspace ids from `auth workspace list --json` when possible. Names are friendlier for humans but can be ambiguous. Use `auth workspace use` with no argument for a human interactive picker; headless scripts should pass an id because no-argument `use` fails non-interactively when multiple local OAuth workspaces exist.

If the active workspace is logged out or its refresh fails, the CLI intentionally does not auto-select another cached workspace. Choose the next workspace explicitly:

Use `auth workspace list --json`, then `auth workspace use <workspace-id>`.

To clean up one local OAuth workspace without clearing every stored workspace session:

```bash
bunx @prisma/cli@latest auth workspace logout <workspace-id-or-name>
# equivalent:
bunx @prisma/cli@latest auth logout --workspace <workspace-id-or-name>
```

Plain `auth logout` clears all local OAuth workspace sessions. It does not unset `PRISMA_SERVICE_TOKEN`.

For a new linked project:

```bash
bunx @prisma/cli@latest project create my-app --json
```

For non-interactive or CI work, current `@prisma/cli` accepts a workspace service token through `PRISMA_SERVICE_TOKEN`. A non-empty service token takes precedence over stored browser-login credentials, so local OAuth workspace switching does not affect command execution while the env var is set. `auth workspace list --json` may still show local OAuth sessions, but they are not switchable until the service-token env var is unset. Verify auth with `auth whoami` and never print the token value.

If `PRISMA_SERVICE_TOKEN` is set but empty, unset it or provide a real token. The CLI should fail instead of silently falling back to local OAuth credentials.

Local auth storage is useful for debugging but should not be printed verbatim:

- `PRISMA_COMPUTE_AUTH_FILE` can override the auth file path.
- On macOS, the default OAuth credentials file is `~/Library/Application Support/prisma/auth.json`.
- Workspace metadata and the active workspace pointer live beside it as `auth.context.json`.
- Project pins live in `.prisma/local.json`.
- Local CLI state such as selected app and known live deployment lives in `.prisma/cli/state.json`, rooted near `prisma.compute.ts` when a config is discovered.

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
- `project env add/update/list/remove --branch <git-name>` manages branch-specific env overrides.
- `project env add/update/list/remove --role production` manages production env.
- `project env add/update/list/remove --role preview` manages preview-template env.

Do not assume a local Git branch was used by the CLI unless the generated script or command output says so. If a user asks for `feature/login`, pass `--branch feature/login` consistently to app, database, and env commands.

Promotion is a separate production action: `app promote <deployment-id>` rebuilds a deployment with production env vars. Do not treat a preview branch deploy as production promotion.

## Deployment Story: GitHub vs CLI

When a Compute app is connected to GitHub push-to-deploy, the default branch is the production deploy path. If a PR has been merged into `main` or another configured default branch, the natural answer is that the changes should appear in production after the production deployment completes; use CLI deploys for explicit manual deploys, local-source deploys, or repositories that are not using GitHub push-to-deploy.

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
bunx @prisma/cli@latest project env update --file .env --role production
bunx @prisma/cli@latest project env update DATABASE_URL=postgresql://... --branch feature/foo
bunx @prisma/cli@latest project env list --branch feature/foo
bunx @prisma/cli@latest project env remove STRIPE_KEY --role preview
```

`app deploy --env .env` loads environment variables from a file for the deployment. A config-backed deploy can instead load env through `prisma.compute.ts` `env`. Neither path is a migration command or seed command.

Database setup is not part of `prisma.compute.ts` in the current beta. Keep database intent explicit with `database create` and project env commands. Do not add database setup or skip flags to deploy examples. Treat any generated connection URL as a one-time secret.

Database and env guardrails:

- Deploys do not run migrations, seed data, or schema push. Run the app's own Prisma database command after deploy setup when needed.
- In deploy-all, every target on the same branch shares branch-scoped project env unless you assign app-specific env values yourself.
- Existing database env values supplied through `--env DATABASE_URL=...`, `--env DIRECT_URL=...`, an env file, or project env should be treated as the source of truth.
- Known non-PostgreSQL Prisma schema sources should not be wired to Prisma Postgres automatically.

## Project Git, Branch, and Database Operations

These commands are part of the same Platform CLI surface and often matter while preparing Compute deploys:

```bash
bunx @prisma/cli@latest branch list --json
bunx @prisma/cli@latest git connect git@github.com:org/repo.git --project proj_123
bunx @prisma/cli@latest git disconnect --project proj_123
bunx @prisma/cli@latest database list --branch feature/foo --json
bunx @prisma/cli@latest database show db_123 --json
bunx @prisma/cli@latest database remove db_123 --confirm db_123
bunx @prisma/cli@latest database connection list db_123 --json
bunx @prisma/cli@latest database connection create db_123 --name readonly
bunx @prisma/cli@latest database connection remove conn_123 --confirm conn_123
```

Git integration connects a Project to a GitHub repository. Console-side GitHub import can create a Compute app and trigger push-to-deploy for the connected repository, including default-branch production deploys. The CLI `git connect` command is setup, not a local deploy command; use `app deploy` for explicit CLI deploys.

For GitHub-driven deploys, inspect the Console/build-runner state or deployment records instead of assuming local CLI output exists. The build runner can perform branch-aware database/env wiring: a preview branch with a Prisma schema and no `DATABASE_URL` can get a branch-scoped preview database, while production can wire a missing `DATABASE_URL` template from an existing ready database. Do not promise GitHub PR comments or Vercel-style preview feedback unless the current product behavior proves that integration exists.

Database and database-connection commands never print stored secret values in list/show output. `database create` and `database connection create` return a one-time connection URL; treat it as a secret, store it immediately in env if needed, and do not echo it back in summaries. Removal requires exact `--confirm <id>`; `--yes` is not enough.

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

For NestJS, use `app build` to validate the Compute artifact and run the framework's own dev command locally:

```bash
bunx @prisma/cli@latest app build --build-type nestjs
bun run dev
```

With a compute config, pass the target name instead of repeating framework/entry/port flags:

```bash
bunx @prisma/cli@latest app build api
bunx @prisma/cli@latest app run api --port 8080
```

`app run --port` sets `PORT` for local development. It does not rewrite an app's explicit host binding, so a local run is not enough to prove the deployed server is reachable from ingress.

`app run --build-type nestjs` is not supported in the current CLI. If a config-backed NestJS target is selected, run the Nest dev server directly instead.

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
