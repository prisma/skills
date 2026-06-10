# Prisma Compute Framework Readiness

Use this reference when deciding whether and how an app can deploy to Prisma Compute.

## CLI-First Model

Treat `@prisma/cli app deploy` as the deployment surface. Treat `create-prisma` as a new-project scaffold that can generate useful defaults and, for some templates, a `compute:deploy` script.

Current `@prisma/cli app deploy --framework` choices are:

```text
nextjs
hono
tanstack-start
bun
```

Current auto-detection:

- Next.js: `next.config.*` or `next` dependency
- Hono: `hono` dependency
- TanStack Start: `@tanstack/react-start`, `@tanstack/solid-start`, or `@tanstack/start`
- Bun: explicit `--entry <path>` or `--framework bun`

If detection is ambiguous, pass a supported `--framework` value. If the app is a plain server or a framework without a dedicated deploy key, use `--framework bun --entry <path>` after verifying the server entrypoint and build output.

## Current CLI Matrix

| App shape | Deploy command shape | Auto-detected | Required output/entry | Notes |
|-----------|----------------------|---------------|-----------------------|-------|
| Next.js | `--framework nextjs` | Yes | standalone `server.js` output | Requires `output: "standalone"` |
| Hono | `--framework hono` | Yes | Bun entry from `main`, `--entry`, or `src/index.ts` | Usually fixed port `8080` in generated scripts |
| TanStack Start | `--framework tanstack-start` | Yes | `.output/server/index.mjs` | Requires Nitro node output |
| Bun / plain server | `--framework bun --entry <path>` | With explicit entry | server entrypoint | Use for Elysia, Nest, custom HTTP servers |
| Elysia | `--framework bun --entry src/index.ts` | No dedicated deploy key | Bun entrypoint | Preserve port/host handling |
| Nest | `--framework bun --entry src/main.ts` or built JS entry | No dedicated deploy key | server entrypoint | Ensure `app.listen(..., "0.0.0.0")` |
| Astro | Not a current deploy framework key | No | Node server artifact | Use only if current CLI adds support or via SDK/prebuilt path |
| Nuxt | Not a current deploy framework key | No | Nitro node server artifact | Use only if current CLI adds support or via SDK/prebuilt path |
| SvelteKit | Not a current deploy framework key | No | Node adapter/prebuilt artifact | Do not deploy `vite preview` |
| Turborepo | Deploy a concrete app package | No | app-specific entry/output | Do not deploy repo root by default |

`app build --build-type` is broader than `app deploy --framework`: current build types include `auto`, `bun`, `nextjs`, `nuxt`, `astro`, and `tanstack-start`, while current deploy framework keys are `nextjs`, `hono`, `tanstack-start`, and `bun`. Do not assume a successful local `app build --build-type astro` or `nuxt` means `app deploy --framework astro` or `nuxt` exists.

`app run --build-type` is local-dev oriented and currently supports `auto`, `bun`, and `nextjs`. It streams the local dev server and is not proof that the deployed app is reachable through public ingress.

## Universal Runtime Requirements

Compute needs a server process:

- It must listen on the deployed HTTP port. Current `@prisma/cli app deploy` defaults to HTTP `3000` unless `--http-port` is passed.
- It must bind on all interfaces. Do not hard-code `localhost` or `127.0.0.1` for a deployed server; use `0.0.0.0`, `server.host: true`, or the framework equivalent.
- It must have a deployable entrypoint or recognized framework output.
- It must not rely on a preview-only command such as `vite preview`.
- It must receive env vars through `--env`, project env, branch env, or the deploy `--db` flow.

Check host and port together. A listener on the right port but bound to loopback can appear ready while public ingress cannot reach it.

## Next.js

Deploy shape:

```bash
bunx @prisma/cli@latest app deploy --framework nextjs --env .env
```

`next.config.ts` must include standalone output:

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig
```

Do not pass `--entry` with `nextjs`; the CLI derives the runtime entrypoint from framework build output.

Do not set `HOSTNAME=localhost` or `HOSTNAME=127.0.0.1` in deploy env. If the standalone server host is overridden, use `0.0.0.0`.

## Hono

Deploy shape:

```bash
bunx @prisma/cli@latest app deploy \
  --framework hono \
  --http-port 8080 \
  --env .env
```

Project expectations:

- `package.json` has `main: "src/index.ts"` or deploy passes `--entry src/index.ts`
- server uses `@hono/node-server`
- code reads `process.env.PORT` and defaults to the same port used by `--http-port`
- code does not set `hostname` to `localhost` or `127.0.0.1`; if hostname is set explicitly, use `0.0.0.0`

Example runtime shape:

```typescript
const rawPort = (process.env.PORT ?? "").trim()
const parsedPort = rawPort.length > 0 ? Number(rawPort) : Number.NaN
const port = Number.isInteger(parsedPort) ? parsedPort : 8080
serve({ fetch: app.fetch, port })
```

## TanStack Start

Deploy shape:

```bash
bunx @prisma/cli@latest app deploy --framework tanstack-start --env .env
```

Expected `vite.config.ts` shape:

```typescript
import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"

export default defineConfig({
  plugins: [tanstackStart(), nitro(), viteReact()],
})
```

Preserve these details:

- keep `nitro` in `dependencies`
- keep `import { nitro } from "nitro/vite"`
- keep `nitro()` in the Vite plugin list
- keep the React Vite plugin after `tanstackStart()`
- keep Nitro on its default node server preset; do not switch to edge, static, Cloudflare, or another non-Node preset for Compute

The build command is `vite build`. The build must produce `.output/server/index.mjs`, and the production start shape is:

```json
{
  "scripts": {
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

Do not deploy TanStack Start as a Bun entrypoint such as `src/router.tsx`. If `.output/server/index.mjs` is missing, fix the TanStack/Nitro build path.

Make sure Nitro does not bind only to localhost in deployment. If host env/config is customized, use the framework's all-interface host setting rather than `localhost`.

## Bun, Elysia, Nest, and Custom Servers

Use the Bun deploy key for app shapes without a dedicated `--framework` value:

```bash
bunx @prisma/cli@latest app deploy \
  --framework bun \
  --entry src/index.ts \
  --http-port 8080 \
  --env .env
```

Requirements:

- pass `--entry` unless `package.json` `main` points at the runtime entrypoint
- ensure the entrypoint starts an HTTP server, not only exports handlers
- read `process.env.PORT` or align `--http-port` with the fixed listener port
- bind on all interfaces

Elysia example:

```typescript
const port = Number(process.env.PORT ?? "8080")
app.listen({ port, hostname: "0.0.0.0" })
```

Nest example:

```typescript
const port = Number(process.env.PORT ?? "3000")
await app.listen(port, "0.0.0.0")
```

## Astro, Nuxt, and SvelteKit

Current `@prisma/cli app deploy --framework` does not expose `astro`, `nuxt`, or `svelte` framework keys. Do not claim these are directly deployable with those names unless current help/source has changed.

For these frameworks, use one of these paths:

- wait for current CLI deploy support and verify the exact `--framework` value
- produce a Node server artifact and deploy through a supported prebuilt/SDK flow
- if the app has a plain Node/Bun server entrypoint, deploy that entrypoint through `--framework bun --entry <path>`

Astro Compute-style server output usually needs:

```javascript
import { defineConfig } from "astro/config"
import node from "@astrojs/node"

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { host: true },
})
```

Nuxt/TanStack-style Nitro output expects:

```text
.output/server/index.mjs
```

SvelteKit should use a Node adapter or another production server artifact. Do not use `vite preview` as the deployed runtime.

## Turborepo

Deploy a concrete app package, not the monorepo root by default.

Checklist:

- choose the app directory, such as `apps/api`
- run the workspace build from the correct root/package
- pass the app package's runtime entrypoint or framework
- pass the correct env file, which may live outside the app package
- keep branch env/database scope aligned with the deployed app

Example shape after verifying output paths:

```bash
bun run build
bunx @prisma/cli@latest app deploy \
  --framework bun \
  --entry apps/api/dist/src/index.js \
  --http-port 3000 \
  --env packages/db/.env
```

Verify the actual output path before using this command.

## create-prisma Template Notes

Use these notes only when the project was scaffolded with `create-prisma` or the user is creating a new app. They are not the general definition of Compute framework support.

`create-prisma@latest` scaffolds these templates:

| Template | Scaffolds | Integrated `--deploy` support | Generated deploy shape |
|----------|-----------|----------------------------------------|------------------------|
| `hono` | Yes | Yes | `@prisma/cli app deploy --framework hono --http-port 8080 ...` |
| `elysia` | Yes | Yes | `@prisma/cli app deploy --framework bun --http-port 8080 ...` |
| `next` | Yes | Yes | `@prisma/cli app deploy --framework nextjs ...` |
| `tanstack-start` | Yes | Yes | `@prisma/cli app deploy --framework tanstack-start ...` |
| `nest` | Yes | No | scaffold only |
| `svelte` | Yes | No | scaffold only |
| `astro` | Yes | No | scaffold only |
| `nuxt` | Yes | No | scaffold only |
| `turborepo` | Yes | No | scaffold only |

The distinction matters: a template can be scaffold-ready without being wired into the integrated `create-prisma --deploy` prompt. Existing apps should still be evaluated against the current `@prisma/cli app deploy` surface.

The generated templates import Prisma Client from local generated paths such as:

```typescript
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
```

Preserve those imports unless you also update the Prisma generator output path and every consumer.
