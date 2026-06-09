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

For non-interactive or CI work, first verify the supported auth mechanism in current help/docs. If only browser login is available, tell the user that a human login step is required before scripted deploy.

Current `@prisma/cli` source accepts a workspace service token through `PRISMA_SERVICE_TOKEN` before falling back to stored browser-login credentials:

```bash
test -n "${PRISMA_SERVICE_TOKEN:-}" && echo "PRISMA_SERVICE_TOKEN is set"
bunx @prisma/cli@latest auth whoami
bunx @prisma/cli@latest app deploy --json --no-interactive --prod --yes --env .env
```

Do not print the token value. Historical standalone Compute CLI examples and low-level SDK snippets may use `PRISMA_API_TOKEN`; do not assume that name works for `@prisma/cli app deploy` unless the current CLI source/help confirms it.

## Project, Branch, Database, and Env Scope

Compute deploys resolve a target project, app, and branch. Be explicit when the user's intent is not the already linked default project/app:

```bash
bunx @prisma/cli@latest project show --json
bunx @prisma/cli@latest app deploy --project proj_123 --app my-api --branch feature/login --json
```

Branch scope must line up across deploys, databases, and env vars:

- `app deploy --branch <git-name>` creates a deployment for that branch.
- `database create <name> --branch <git-name>` creates a Prisma Postgres database for that branch scope.
- `project env add/list/remove --branch <git-name>` manages branch-specific env overrides.
- `project env add/list/remove --role production` manages production env.
- `project env add/list/remove --role preview` manages preview-template env.

Do not assume a local Git branch was used by the CLI unless the generated script or command output says so. If a user asks for `feature/login`, pass `--branch feature/login` consistently to app, database, and env commands.

Promotion is a separate production action: `app promote <deployment-id>` rebuilds a deployment with production env vars. Do not treat a preview branch deploy as production promotion.

The current `app show`, `app list-deploys`, and `app logs` help exposes `--app`, `--project`, and for logs `--deployment`, not `--branch`. For branch debugging, capture the deployment id from deploy JSON and inspect that deployment or its logs.

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

`app deploy --env .env` loads environment variables from a file for the deployment. It is not a migration command and does not seed data.

If the deploy should create and wire a Prisma Postgres database for the deploy target, current `app deploy` exposes `--db`; use `--no-db` to skip database setup. Treat any generated connection URL as a one-time secret.

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

`app run --port` sets `PORT` for local development. It does not rewrite an app's explicit host binding, so a local run is not enough to prove the deployed server is reachable from ingress.

## Runtime Host and Port

For deploys, check both pieces:

- Port: current `@prisma/cli app deploy` uses HTTP `3000` by default when `--http-port` is omitted.
- Generated scripts: Hono/Elysia `compute:deploy` scripts pass `--http-port 8080`; trust the generated script unless you are intentionally changing the app port.
- Host: deployed servers must bind all interfaces. Do not hard-code `localhost` or `127.0.0.1`; use `0.0.0.0` or the framework equivalent.

If a fixed-port Bun app listens on `8080`, deploy it with `--http-port 8080`. If a framework server reads `process.env.PORT`, keep the code path intact and avoid deploy env that overrides the host to loopback.

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
bunx @prisma/cli@latest app domain wait shop.example.com --timeout 15m
bunx @prisma/cli@latest app domain retry shop.example.com
bunx @prisma/cli@latest app domain remove shop.example.com
```

## Output Handling

When `--json` is available, parse the JSON and summarize:

- project id/name
- branch name
- app id/name
- deployment id/status
- deployment URL
- database id/name if one was created

Do not print secret env var values.
