# Troubleshooting Prisma Compute

Use this reference when setup, build, deploy, env, or runtime behavior fails.

## First Checks

Run:

```bash
bunx @prisma/cli@latest --help
bunx @prisma/cli@latest app deploy --help
bunx @prisma/cli@latest auth whoami
```

Then inspect:

```bash
pwd
cat package.json
test -f .env && sed -n 's/=.*/=<redacted>/p' .env
```

Do not print unredacted secrets.

## `prisma app deploy` Unknown

If `bunx prisma@latest app deploy --help` says `Unknown command "app"`, this is expected before launch. Use:

```bash
bunx @prisma/cli@latest app deploy --help
```

If a local project has a `compute:deploy` script, prefer that script.

## `create-prisma --yes` Did Not Deploy

`--yes` skips prompts and does not opt into deploy. Pass `--deploy` explicitly:

```bash
bunx create-prisma@pr34 --name my-api --template hono --provider postgresql --deploy
```

If the template is not deployable in the integrated flow, scaffold succeeds but deploy should be skipped or reported as unsupported.

## Accidental Prisma Postgres Provisioning

With PostgreSQL, no `--database-url`, and no `--no-prisma-postgres`, setup can provision Prisma Postgres. For local smoke tests, pass:

```bash
--no-prisma-postgres --database-url "postgresql://USER:PASSWORD@HOST:PORT/DB"
```

Use a disposable real database URL if Prisma commands need to run.

## Auth Fails

Symptoms:

- `project list` fails
- `auth whoami` fails
- browser login was not completed
- `PRISMA_SERVICE_TOKEN` is missing, empty, expired, or lacks workspace/project permissions

Fix:

```bash
bunx @prisma/cli@latest auth login
bunx @prisma/cli@latest auth whoami
```

For CI, current `@prisma/cli` can authenticate with `PRISMA_SERVICE_TOKEN`:

```bash
test -n "${PRISMA_SERVICE_TOKEN:-}" && echo "PRISMA_SERVICE_TOKEN is set"
bunx @prisma/cli@latest auth whoami
bunx @prisma/cli@latest app deploy --json --no-interactive --prod --yes --env .env
```

If `PRISMA_SERVICE_TOKEN` is set but empty, the CLI errors before trying browser-login credentials. Unset it or provide a valid workspace service token. Never echo, log, or paste the token value; only check whether it is present.

Older `@prisma/compute-cli` and SDK examples may use `PRISMA_API_TOKEN`. Treat that as legacy or SDK-specific until the current `@prisma/cli` source/help says otherwise.

## Missing or Placeholder `DATABASE_URL`

Symptoms:

- Prisma Client throws `DATABASE_URL is required`
- migration scripts fail immediately
- deploy runs but app fails on database access

Fix:

1. Put a real production-ready `DATABASE_URL` in `.env` or project env.
2. Run `prisma generate`.
3. Run migrations with the project's `db:migrate` or production migration command.
4. Redeploy with `--env .env` or project env configured.

If Prisma Client generation or runtime env loading is the concrete failure, then inspect Prisma-specific config:

```bash
test -f prisma.config.ts && sed -n '1,160p' prisma.config.ts
test -f prisma/schema.prisma && sed -n '1,220p' prisma/schema.prisma
```

Never deploy `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` placeholder values.

## Wrong Branch, Env, or Database

Symptoms:

- preview deploy reads production env
- branch deploy cannot find `DATABASE_URL`
- app is deployed to the expected branch but points at the wrong database
- logs are inspected for the current app while the failing URL belongs to a different deployment id

Check:

```bash
bunx @prisma/cli@latest project show --json
bunx @prisma/cli@latest project env list --role production --json
bunx @prisma/cli@latest project env list --role preview --json
bunx @prisma/cli@latest project env list --branch feature/foo --json
bunx @prisma/cli@latest app list-deploys --json
bunx @prisma/cli@latest app logs --deployment <deployment-id> --json
```

Fix:

- pass the same `--branch <git-name>` to `app deploy`, `database create`, and branch-specific `project env` commands
- use `--role production` for production env and `--role preview` for preview-template env
- capture the deployment id and URL from deploy JSON, then inspect logs with `app logs --deployment <deployment-id>`
- do not assume `app show`, `app list-deploys`, or `app logs` can filter by branch unless current help output adds that flag
- treat `app promote <deployment-id>` as a production action because it rebuilds with production env vars

## Next.js Standalone Missing

Error shape:

```text
Next.js build did not produce standalone output
```

Fix `next.config.ts`:

```typescript
const nextConfig = {
  output: "standalone",
}

export default nextConfig
```

Then reinstall/build if needed and deploy again.

## Nitro Entry Missing

Nuxt or TanStack Start error shape:

```text
.output/server/index.mjs
```

General fix:

- ensure the correct framework plugins are installed
- run the framework build locally
- avoid custom Nitro presets that produce a non-Node target
- use the default Nitro node server preset

For TanStack Start specifically:

- keep `nitro` in `dependencies`
- keep `import { nitro } from "nitro/vite"` in `vite.config.ts`
- keep `plugins: [tanstackStart(), nitro(), viteReact()]` or the framework-equivalent plugin order
- run `bun run build` and verify `.output/server/index.mjs` exists
- do not replace the production server with `vite preview`

Current Compute detection selects TanStack Start when it sees `@tanstack/react-start` or `@tanstack/solid-start`. If the Nitro entrypoint is missing after that, fix the TanStack/Nitro build output; do not assume Compute will silently fall back to a Bun deployment.

## Bun Entrypoint Missing

Error shape:

```text
Entrypoint is required
Entrypoint file does not exist
```

Fix either:

```json
{
  "main": "src/index.ts"
}
```

or deploy with:

```bash
bunx @prisma/cli@latest app deploy --framework bun --entry src/index.ts
```

## Port Mismatch

Symptoms:

- deploy succeeds but the app is unreachable
- health checks fail
- logs show the server listening on a different port

Fix:

- read `process.env.PORT`
- pass `--http-port <port>` when the app has a fixed port
- use the generated `compute:deploy` script when it exists
- remember the current `@prisma/cli app deploy` default is HTTP `3000`; generated Hono/Elysia `compute:deploy` scripts pass `--http-port 8080`
- use the template defaults: Hono/Elysia `8080`, Next/TanStack/Nuxt `3000`, Astro `4321`

## Public URL Smoke Test Fails

Symptoms:

- deploy command completed
- `app show` or deploy output has a URL
- the public URL times out, returns 5xx, or returns an unexpected page

Check:

```bash
node prisma-compute/scripts/smoke-deployed-app.mjs https://<deployment-url>
node prisma-compute/scripts/smoke-deployed-app.mjs --expect "ok" https://<deployment-url>/health
bunx @prisma/cli@latest app logs --json
```

Fix by following the first concrete failure:

- connection timeout or 5xx: check logs, host binding, and port mapping
- unexpected status or body: verify the route path and app framework output
- local URL tested by mistake: rerun against the public deployment URL, not `localhost` or `127.0.0.1`

## Localhost Binding

Symptoms:

- deploy says the app started or the port was observed, but the public URL is unreachable
- logs show a server listening on `localhost` or `127.0.0.1`
- `app run` works locally, but the deployed app cannot receive external traffic

Why this happens:

Compute's boot watcher polls `/proc/net/tcp` and `/proc/net/tcp6` for configured ports entering `LISTEN`. That readiness signal tracks the port, not whether the app bound `127.0.0.1` or all interfaces. A loopback-only listener can therefore look ready while public ingress still cannot reach it.

Fix:

- remove hard-coded `localhost` or `127.0.0.1` server host settings
- bind on `0.0.0.0` or the framework equivalent, such as Astro `server.host: true`
- for Next.js standalone, do not deploy with `HOSTNAME=localhost`; use `HOSTNAME=0.0.0.0` if the host is overridden
- keep port and host fixes together: `0.0.0.0:<deployed-http-port>`

## Env Changes Did Not Apply

Generated `compute:deploy` scripts redeploy with `--env .env`; they do not run migrations or seed data.

After env changes:

```bash
bunx @prisma/cli@latest project env list
bunx @prisma/cli@latest project env list --branch feature/foo
bunx @prisma/cli@latest app deploy --prod --yes --env .env
bunx @prisma/cli@latest app deploy --branch feature/foo --env .env.preview
```

If using branch-specific env, confirm the branch name and role.

## Need Logs

Current app:

```bash
bunx @prisma/cli@latest app logs
```

Specific deployment:

```bash
bunx @prisma/cli@latest app logs --deployment <deployment-id>
```

Machine-readable:

```bash
bunx @prisma/cli@latest app logs --json
```

Summarize relevant errors. Do not paste secrets.
