# Prisma Compute Config

Use this reference when creating or updating `prisma.compute.ts`, especially for monorepos, multi-app deploys, reusable framework defaults, env inputs, ports, entrypoints, or build settings.

`prisma.compute.ts` is not required for every deploy. A simple app can deploy with `@prisma/cli app deploy --framework ... --entry ... --http-port ... --env ...`. The config file exists to make those app-level defaults typed and repeatable.

For monorepos or multi-app repositories, use `prisma.compute.ts`: it is the practical way to tell Compute which app target lives at which `root` and which framework/entry/env defaults belong to each target.

## File Names and Discovery

The canonical file is `prisma.compute.ts`. The loader also accepts:

```text
prisma.compute.mts
prisma.compute.js
prisma.compute.mjs
prisma.compute.cjs
```

Keep exactly one compute config file in a directory. If multiple names exist together, the CLI reports `COMPUTE_CONFIG_INVALID`.

The CLI searches from the invocation directory up to the repository or workspace boundary. Boundaries include `.git`, `pnpm-workspace.yaml`, `bun.lock`, or `package.json#workspaces`. Config-relative paths such as `root` and `env.file` resolve from the config file directory. `--env` flag paths still resolve from the invocation directory.

When a config is discovered, its directory becomes the Compute project directory for local state: `.prisma/local.json` and `.prisma/cli/state.json` live beside that config, not necessarily inside the app root.

## Basic Shape

Import `defineComputeConfig` from `@prisma/compute-sdk/config`. The CLI aliases this helper when loading the config, so the command can evaluate the config without a local SDK install solely for runtime loading.

```typescript
import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "api",
    framework: "hono",
    httpPort: 8080,
    env: ".env",
  },
});
```

JavaScript configs can default-export a plain object, but prefer `prisma.compute.ts` for type checking.

Define exactly one of:

- `app` for a single deploy target
- `apps` for a monorepo or multi-app repository

Do not define both, and do not add unrelated top-level keys.

## App Fields

Each app target accepts:

| Field | Meaning |
|-------|---------|
| `name` | Deployed app name. Defaults to the `apps` key, then CLI inference. |
| `root` | App directory relative to the config file. Defaults to the config directory. |
| `framework` | Deploy framework: `nextjs`, `nuxt`, `astro`, `hono`, `tanstack-start`, or `bun` in current CLI source. |
| `entry` | Entrypoint path for Bun/Hono-style deploys, relative to the app root. |
| `httpPort` | Deployed HTTP port. Use this for fixed-port apps. |
| `env` | Dotenv file path string, or `{ file, vars }`. Paths resolve from the config directory. |
| `build` | `{ command, outputDirectory }`. Present means the config owns build settings for that target. |

`env` examples:

```typescript
export default defineComputeConfig({
  app: {
    framework: "nextjs",
    env: {
      file: [".env", ".env.production"],
      vars: {
        NODE_ENV: "production",
      },
    },
  },
});
```

Do not put secrets directly in committed `vars`. Keep secret values in platform env, CI secrets, or dotenv files that are intentionally managed outside version control.

`build` examples:

```typescript
export default defineComputeConfig({
  app: {
    framework: "nextjs",
    build: {
      command: "pnpm build",
      outputDirectory: ".next/standalone",
    },
  },
});
```

Use `command: null` to skip the build step only when the app root already contains the deployable artifact.

`build` applies to frameworks whose build settings are configurable by Compute, such as `nextjs`, `hono`, `tanstack-start`, and `bun`. In current CLI source, Nuxt and Astro use their framework CLI output and reject a custom `build` block.

## Monorepos and Multi-App Repos

For monorepos, put `prisma.compute.ts` at the repo or workspace root and use `apps`. This keeps project binding and local `.prisma/` state at the repo root while each app builds from its own `root`.

```typescript
import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  apps: {
    web: {
      root: "apps/web",
      framework: "nextjs",
      env: "apps/web/.env",
    },
    api: {
      root: "apps/api",
      framework: "hono",
      entry: "src/index.ts",
      httpPort: 8080,
      env: {
        file: "apps/api/.env",
        vars: {
          LOG_LEVEL: "info",
        },
      },
    },
  },
});
```

Target selection:

```bash
bunx @prisma/cli@latest app deploy web
bunx @prisma/cli@latest app deploy api
bunx @prisma/cli@latest app build api
bunx @prisma/cli@latest app run api --port 8080
```

When the CLI supports deploy-all, a bare deploy in a multi-app config can deploy all targets in declaration order:

```bash
bunx @prisma/cli@latest app deploy --branch feature/foo --json --no-interactive
```

Deploy-all rejects per-app overrides such as `--app`, `--framework`, `--entry`, `--http-port`, and `--env`. Project and branch flags still apply to the whole run.

`app build` and `app run` still need one target in multi-app configs because a local build/run command cannot operate N apps at once.

## Precedence

Explicit flags win over config values:

- `--framework` overrides `framework`
- `--entry` overrides `entry`
- `--http-port` overrides `httpPort`
- any `--env` flag replaces all config env inputs
- `--app` and `PRISMA_APP_ID` rank above config app names

`prisma.compute.ts` never selects Workspace, Project, Branch, or production intent. Keep those in CLI flags, environment variables, `.prisma/local.json`, or CI configuration:

```bash
bunx @prisma/cli@latest app deploy api \
  --project proj_123 \
  --branch feature/foo \
  --prod \
  --yes
```

## Database Scope

The config does not declare databases in the current beta. Database setup remains explicit:

```bash
bunx @prisma/cli@latest app deploy api --db
bunx @prisma/cli@latest app deploy web --no-db
```

In multi-app deploy-all runs, `--db` creates and wires one branch database and reuses it for the remaining targets. If apps need separate databases, create and assign those env vars explicitly instead of expecting `--db` to infer app-to-database ownership.

## Relationship to `prisma.config.ts`

Do not put Compute deploy defaults in `prisma.config.ts` today. Prisma ORM uses `prisma.config.ts`, while Compute uses `prisma.compute.ts`.

The CLI design reserves a future path where the Compute shape can become a `compute` key inside the unified Prisma config, but current skills should create and maintain `prisma.compute.ts`.
