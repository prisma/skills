---
name: prisma-compute
description: Prisma Compute deployment and hosting guide. Use whenever the user mentions Prisma Compute, `prisma.compute.ts`, `defineComputeConfig`, deploying or hosting a Prisma app, `@prisma/cli app deploy`, `compute:deploy`, `create-prisma --deploy`, `PRISMA_SERVICE_TOKEN`, Compute apps/deployments/logs/domains, localhost vs `0.0.0.0`, deploy port binding, or framework deploy readiness for Hono, Elysia, Next.js, TanStack Start, Astro, Nuxt, Svelte, Nest, or Turborepo.
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma Compute

Guide agents through Prisma Compute app creation, deployment, operations, and framework-specific deploy readiness.

## Critical: Verify the Current Surface

Prisma Compute is actively moving into the Prisma Platform CLI. Before giving commands or editing a project, verify the local/current command surface:

```bash
bunx @prisma/cli@latest app deploy --help
bunx @prisma/cli@latest app --help
bunx create-prisma@latest --help
```

Use `@prisma/cli@latest` for Compute app deployment unless current help output shows the command has moved. Use `create-prisma@latest` for new-project scaffolding after verifying `--deploy` appears in `create-prisma@latest --help`.

For a compact agent-readable summary, run:

```bash
node prisma-compute/scripts/verify-compute-surface.mjs
```

Set `PRISMA_COMPUTE_RUNNER=bunx` to use `bunx` instead of `npx`.

## Source-of-Truth Order

Prefer evidence that matches the user's project and installed tooling:

1. The project's generated scripts and config, especially `prisma.compute.ts`, `compute:deploy`, framework config, and `package.json`.
2. Current CLI help output from `create-prisma` and `@prisma/cli`.
3. Local installed package code, generated artifacts, and type definitions.
4. Official docs or launch notes, especially after Compute is public.

If these disagree, trust the more local/current source and explain the mismatch briefly.

## When to Apply

Use this skill for:

- Creating a new app that can deploy to Prisma Compute
- Deploying an existing TypeScript app to Prisma Compute
- Creating or updating a typed `prisma.compute.ts` deploy config
- Deciding whether a framework is Compute-ready
- Debugging `create-prisma --deploy`, `compute:deploy`, or `app deploy`
- Managing Compute app logs, deployments, environment variables, branches, and domains
- Running non-interactive deploys with browser auth or Prisma service tokens
- Programmatic deployments with `@prisma/compute-sdk` or Management API integrations

## Decision Tree

1. Existing project deployment or redeploy:
   Read [`references/app-deploy-cli.md`](references/app-deploy-cli.md).

2. Typed Compute config, monorepos, deploy targets, app roots, or build/env defaults:
   Read [`references/compute-config.md`](references/compute-config.md).

3. Framework-specific build/runtime work:
   Read [`references/frameworks.md`](references/frameworks.md).

4. New project from a scaffold:
   Read [`references/create-prisma.md`](references/create-prisma.md).

5. Programmatic deployment, SDKs, APIs, or low-level service/version concepts:
   Read [`references/sdk-api.md`](references/sdk-api.md).

6. Build, auth, env, deploy, or runtime failures:
   Read [`references/troubleshooting.md`](references/troubleshooting.md).

## Rules by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Command verification | CRITICAL | `verify-` |
| 2 | Framework readiness | CRITICAL | `framework-` |
| 3 | Runtime host and port binding | CRITICAL | `runtime-` |
| 4 | Typed Compute config | HIGH | `config-` |
| 5 | Branch, environment, and database wiring | HIGH | `env-` |
| 6 | Deploy operations | HIGH | `deploy-` |
| 7 | SDK and API automation | MEDIUM | `sdk-` |

## Quick Rules

### 1. Command Verification

- `verify-help-first` - Run current help output before assuming package names or flags.
- `verify-helper-script` - Use `scripts/verify-compute-surface.mjs` for a compact current CLI summary when available.
- `verify-prisma-vs-platform-cli` - Do not assume `prisma app deploy` exists in the ORM CLI; check whether the task should use `@prisma/cli`.
- `verify-generated-scripts` - Prefer the generated `compute:deploy` script when a project already has one.
- `verify-public-url` - After a real deploy, smoke-test the public deployment URL instead of trusting local or readiness-only checks.
- `verify-config-support` - For `prisma.compute.ts`, verify current CLI help/source because published package help may lag the repo.

### 2. Framework Readiness

- `framework-cli-first` - Evaluate deploy readiness against current `@prisma/cli app deploy`, not against what `create-prisma` can scaffold.
- `framework-supported-cli-deploy` - Current CLI source supports `nextjs`, `nuxt`, `astro`, `hono`, `tanstack-start`, and `bun`; verify installed help/source before relying on a key.
- `framework-create-prisma-defaults-only` - `create-prisma` can provide generated defaults and `compute:deploy`, but it is not the general deploy surface for existing apps.
- `framework-build-output` - Compute needs a server entrypoint or framework artifact, not only static output.

### 3. Runtime Host and Port Binding

- `runtime-bind-all-interfaces` - Deployed servers must bind on all interfaces (`0.0.0.0` or the framework equivalent), not hard-coded `localhost` or `127.0.0.1`.
- `runtime-match-http-port` - The app must listen on the deployed HTTP port: read `process.env.PORT` when possible, or pass the matching `--http-port`.
- `runtime-readiness-port-only` - Compute readiness watches listening ports; a loopback-only listener can look ready while public ingress cannot reach it.

### 4. Typed Compute Config

- `config-optional-simple-app` - `prisma.compute.ts` is not required to deploy a normal single app; use flags when there is no durable config.
- `config-use-prisma-compute-ts` - Put reusable deploy defaults in `prisma.compute.ts` with `defineComputeConfig`, not in `prisma.config.ts`.
- `config-app-vs-apps` - Use `app` for a single deploy target and `apps` for monorepos or multi-app repos; define exactly one.
- `config-monorepo-roots` - For monorepos, use `prisma.compute.ts` to declare app targets, roots, framework defaults, entrypoints, ports, and env inputs.
- `config-targets` - In multi-app configs, `@prisma/cli app deploy web` selects the `apps.web` target. Without `[app]`, commands can infer the target from the current directory; otherwise deploy can run all targets while build/run require one.
- `config-no-project-branch-secrets` - Do not commit Workspace, Project, Branch, production intent, service tokens, or secret values in `prisma.compute.ts`; keep those in flags, `.prisma/local.json`, env storage, or CI secrets.
- `config-flags-win` - Explicit deploy flags such as `--framework`, `--entry`, `--http-port`, and `--env` override matching config values.

### 5. Branch, Environment, and Database

- `env-do-not-leak-secrets` - Never print full `DATABASE_URL`, service tokens, or secret values.
- `env-deploy-loads-dotenv` - Generated deploy scripts may load env via `prisma.compute.ts` or `--env .env`; inspect the actual script/config before redeploy.
- `env-migrations-separate` - Redeploy scripts do not run migrations or seed data. Run the appropriate Prisma database scripts separately.
- `env-cli-token-name` - Current `@prisma/cli` uses `PRISMA_SERVICE_TOKEN` for service-token auth.
- `env-branch-scope` - Branch deploys, branch env vars, and branch databases must use the same branch name; pass `--branch <git-name>` explicitly when targeting a preview branch.
- `env-production-vs-preview` - Use `--role production` for production env, `--role preview` for preview template env, and `--branch <git-name>` for branch-specific overrides.
- `env-db-explicit` - `--db` creates and wires one Prisma Postgres database for the branch; it never runs migrations, never creates one database per app, and conflicts with database URLs supplied through `--env`.

### 6. Deploy Operations

- `deploy-prod-intent` - Use `--prod --yes` only when the user intends a production deploy.
- `deploy-noninteractive-auth` - Non-interactive deploys need either stored CLI login or a supported service token env var; never print the token.
- `deploy-json-for-agents` - Use `--json --no-interactive` for scripts and agent-readable output.
- `deploy-create-project` - Use `--create-project <name>` only when the user wants deploy to create and link a new project; it conflicts with `--project` and `PRISMA_PROJECT_ID`.
- `deploy-ops-targets` - App show/open/logs/list-deploys/promote/rollback/remove and domain commands can also accept `[app]` targets from `prisma.compute.ts`.

### 7. SDK and API

- `sdk-use-cli-first` - Prefer `@prisma/cli app deploy` for app workflows; use `create-prisma` only to scaffold a new app unless the user is building lower-level automation.
- `sdk-result-handling` - `@prisma/compute-sdk` returns `Result` values; check `isOk()`/`isErr()` instead of relying on exceptions.

## Preferred Workflow

1. Inspect the project: package manager, template/framework, `package.json` scripts, Prisma version, Prisma client location, `prisma.compute.ts`, and existing `compute:deploy`.
2. Verify CLI help output for the package actually being used, or run `scripts/verify-compute-surface.mjs` for the standard Compute surface check.
3. Choose the path:
   - existing app deploy: config-backed target when present, generated `compute:deploy`, or `@prisma/cli app build/run/deploy` flags
   - new app scaffold: `create-prisma`, then generated `compute:deploy` or `@prisma/cli app deploy`
   - low-level automation: `@prisma/compute-sdk` or Management API
4. Check framework readiness plus host/port/env/runtime requirements, including project and branch scope.
5. Run a local build or `app build` before deploying when feasible.
6. Deploy with JSON output when automating, then smoke-test the public URL and summarize app URL, app id, deployment id, project id, and follow-up steps.

## Avoid

- Do not bury Compute deployment guidance in the generic `prisma-cli` skill.
- Do not run `create-prisma` inside an existing app just to deploy it; use the generated `compute:deploy` script or `@prisma/cli app deploy`.
- Do not tell users that every `create-prisma` template can auto-deploy.
- Do not put Compute deploy defaults in `prisma.config.ts`; use `prisma.compute.ts` until the CLI ships a unified config shape.
- Do not deploy with placeholder `DATABASE_URL` values.
- Do not assume `next start` is the Compute runtime path; Next.js deploys need standalone output.
- Do not expose secret values from `.env`, CLI output, Management API responses, or logs.
