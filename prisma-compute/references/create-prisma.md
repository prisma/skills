# create-prisma Compute Flow

Use this reference when creating a new app with Prisma and optionally deploying it to Prisma Compute.

Do not use `create-prisma` as the deploy path for an existing app. For existing projects, use the generated `compute:deploy` script when present, or call `bunx @prisma/cli@latest app deploy` directly after verifying current help output.

## Current Reference

Verify current scaffold behavior:

```bash
bunx create-prisma@latest --help
bunx create-prisma@latest --version
```

Use `create-prisma@latest` for new-project scaffolding after verifying `--deploy` appears in `create-prisma@latest --help`.

## Supported Templates

`create-prisma` scaffolds these templates:

| Template | Scaffolds | Integrated `--deploy` support |
|----------|-----------|--------------------------------|
| `hono` | Yes | Yes |
| `elysia` | Yes | Yes |
| `next` | Yes | Yes |
| `tanstack-start` | Yes | Yes |
| `nest` | Yes | No |
| `svelte` | Yes | No |
| `astro` | Yes | No |
| `nuxt` | Yes | No |
| `turborepo` | Yes | No |

The distinction matters: a template can be scaffold-ready but not wired into the integrated deploy prompt yet.

## Basic Commands

Interactive creation:

```bash
bunx create-prisma@latest
```

Non-interactive scaffold only:

```bash
bunx create-prisma@latest \
  --name my-api \
  --template hono \
  --provider postgresql \
  --no-install \
  --no-generate \
  --no-migrate-and-seed \
  --no-deploy
```

Create and deploy a supported template:

```bash
bunx create-prisma@latest \
  --name my-api \
  --template hono \
  --provider postgresql \
  --deploy
```

## PostgreSQL and Database Behavior

With PostgreSQL, no explicit `--database-url`, and no `--no-prisma-postgres`, the Compute flow can create:

- a Prisma Compute project
- a `main` Prisma Postgres database on the `main` branch
- a `.env` file containing `DATABASE_URL`
- an initial Compute deployment with env vars loaded from `.env`

`create-prisma` is the new-project path. If the user needs a later preview branch deploy, use the generated `compute:deploy` script or `@prisma/cli app deploy --branch <git-name>` after the app exists. Keep branch names aligned across `app deploy --branch`, `database create --branch`, and `project env ... --branch`.

For unattended local tests, pass `--no-prisma-postgres` unless you intentionally want provisioning:

```bash
bunx create-prisma@latest \
  --name smoke-app \
  --template hono \
  --provider postgresql \
  --no-prisma-postgres \
  --database-url "postgresql://USER:PASSWORD@HOST:PORT/DB" \
  --no-deploy
```

Do not deploy placeholder database URLs. If `DATABASE_URL` came from a placeholder default, omit it from deploy env and ask the user for a real production database.

## Generated Deploy Script

When the deploy flow is selected, `create-prisma` adds:

```json
{
  "scripts": {
    "compute:deploy": "bunx @prisma/cli@latest app deploy --prod --yes --env .env ..."
  }
}
```

Use the actual generated script from `package.json`; do not reconstruct it from memory. The script redeploys app code and env from `.env`. It does not create a new project, create a new database, run migrations, or seed data. If a scaffolded project does not have `compute:deploy`, use `@prisma/cli app deploy` directly after verifying current help output.

## Template Defaults to Preserve

Hono and Elysia:

- include `main: "src/index.ts"` for entrypoint detection
- default to port `8080`
- read `PORT` from the environment
- do not bind the deployed server to `localhost` or `127.0.0.1`; use the framework default if it binds all interfaces, or set `0.0.0.0`

Next.js:

- uses `output: "standalone"` in `next.config.ts`
- must not deploy with `HOSTNAME=localhost` or another loopback-only host override

TanStack Start:

- uses `vite build`
- expects Nitro output at `.output/server/index.mjs`
- includes `nitro` as a dependency
- imports `nitro` from `nitro/vite`
- uses `plugins: [tanstackStart(), nitro(), viteReact()]` in `vite.config.ts`
- uses `start: "node .output/server/index.mjs"`
- should keep Nitro on an all-interface runtime host for deployed Compute apps

All Prisma 7 scaffolds:

- use `prisma.config.ts`
- load `dotenv/config` where the runtime supports it
- generate Prisma Client into a template-local `generated/prisma/client` path
- use `@prisma/adapter-pg` with a `DATABASE_URL` connection string for PostgreSQL

## Addon Notes

`create-prisma` supports `--skills`, `--mcp`, and `--extension`. Those are separate from Compute deployment. Do not imply that enabling skills or MCP deploys the app.

## Failure Handling

If `--deploy` is explicit and setup cannot authenticate, cannot run the Platform CLI, or the template is not deployable, report that deploy failed and keep the scaffolded project. Do not delete the user's files.
