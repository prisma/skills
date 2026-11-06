---
name: prisma-postgres-upgrade
description: Upgrade a PostgreSQL app from Prisma ORM 6 or 7 straight to Prisma 8 and deploy it on Prisma Compute, keeping the existing schema.prisma, database and data. Use when a Postgres project on Prisma 6 or 7 wants Prisma 8, Prisma Compute, or the Console's "Set up Prisma Cloud deploys" pull request. Triggers on "upgrade prisma 6 to 8", "upgrade prisma 7 to 8", "upgrade to prisma 8 postgres", "move my prisma app to prisma compute", "prisma7Schema", "migrations/app", "service.load().db.client", "@prisma/client did not initialize yet".
license: MIT
metadata:
  author: prisma
  version: "1.1.0"
---

# Prisma Postgres Upgrade: Prisma ORM 6 or 7 to Prisma 8 on Compute

Move a Node.js server on Prisma ORM 6 or 7 and PostgreSQL to Prisma 8 in one pass, then deploy
it on Prisma Compute. The schema, the database and its data stay.

This skill is the bridge. It covers only what is specific to leaving Prisma ORM 6 or 7 and
landing on Compute. Prisma 8 itself (the contract, migrations, queries, errors) is covered by the
`prisma-8` skill that ships inside `@prisma/orm-postgres`, which step 2 installs. Follow it for
anything Prisma 8 specific; it matches the installed version, and this skill does not.

`prisma-8` says it does not apply to a project that still has `schema.prisma` and
`@prisma/client`. That is expected mid-upgrade: this skill keeps both until step 6, and
`prisma7Schema(...)` reads that `schema.prisma`. Use `prisma-8` for the Prisma 8 side anyway.

The [Prisma ORM 6 or 7 to 8 on Prisma Compute (PostgreSQL) guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute)
is the source of truth for the steps.

**Never do either of these:**

- Never route a PostgreSQL Prisma ORM 6 app through Prisma ORM 7 first. Prisma 8 reads a
  Prisma ORM 6 `schema.prisma` unchanged, so `prisma-upgrade-v7` is only for apps that stay on 7.
- Never install `prisma@latest`, `@prisma/orm-postgres@latest` or the latest Composer packages
  while the Console's Compute setup pins versions: the latest set does not work together, so the
  deploy fails.

## When to Apply

- A PostgreSQL project on Prisma ORM 6 or 7 asks to upgrade to Prisma 8
- The user wants to deploy a Prisma ORM 6 or 7 app on Prisma Compute
- The Console blocked setup with "move to Prisma ORM 8", or opened **Set up Prisma Cloud
  deploys** on `prisma-cloud/setup`

Not for: MongoDB (use `prisma-mongodb-upgrade`), a Prisma ORM 7 app moving one route at a time
beside Prisma 8 (follow the [side-by-side guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql)),
a project already on Prisma 8 (use the synced `prisma-8` skill), or a new project (use
`prisma-orm-setup`).

## Versions

Install exactly the versions the Console's setup uses, with `--save-exact`: today `prisma`
`8.0.0-rc.27` (dev dependency), `@prisma/orm-postgres` `8.0.0-rc.20`, and in step 5
`@prisma/composer` and `@prisma/composer-prisma-cloud` `0.34.0` (the release that peers on
`@prisma/orm-postgres` `8.0.0-rc.20`). If the repository already has a setup pull request, or
the Console's message names other versions, use those. Use Node.js 24.11 or newer; `prisma dev`
needs it.

## The path

| Step | What happens | Where the detail is |
|------|--------------|---------------------|
| 0 | Run the repo's own checks and record the results | `verify-upgrade-checklist` |
| 1 | Remove `prisma`, install the versions above | this file |
| 2 | Write the Prisma 8 `prisma.config.ts`, then `npx prisma skills sync` | `adopt-schema-and-migrations` |
| 3 | `contract emit`, `db sign`, baseline migration, retire `prisma/migrations` | `adopt-schema-and-migrations` |
| 4 | Rewrite every query for the Prisma 8 client | `client-api-mapping` |
| 5 | Compute: the Console setup pull request and its fixes, or the same files written by hand | `compute-setup-pr-fixes` |
| 6 | Remove `@prisma/client`, the adapter and the generated client | this file |
| 7 | Run the same checks again and start the app | `verify-upgrade-checklist` |

Step 1 removes the only command that generated the old client. It keeps working locally, but a
fresh install (CI, a new clone) has none, so finish step 4 before pushing to a branch CI builds.

The sync in step 2 installs `prisma-8`, `prisma-platform-core-concepts` and
`prisma-composer-core-concepts` in one go, because the CLI depends on Composer. It writes them
for every agent it knows unless `skills.agents` in the config lists only the ones the repository
uses. In a Prisma ORM 7 app, replace the old `prisma.config.ts` before syncing: the sync fails
with `CLI.CONFIG_UNREADABLE` while the old one is in place.

In step 6, `npm uninstall @prisma/client` leaves the generated client behind; delete
`node_modules/.prisma` too, then run a fresh install and the checks so nothing still imports it.

## What the user does

The agent cannot do these; stop and ask:

- Connect the repository in the [Prisma Console](https://console.prisma.io), which opens the
  setup pull request, or run `npx prisma git connect`, which is interactive.
- Choose the region for the first deploy. It cannot be changed later.
- Provide values for the environment variables the app reads (`prisma project env add`).
- Approve the push to `prisma-cloud/setup`. Every push deploys a preview; merging deploys
  production.
- Decide what to do about a database time zone other than UTC (see `client-api-mapping`).

## Reference files

| Reference | What it covers |
|-----------|----------------|
| `references/adopt-schema-and-migrations.md` | The first `prisma.config.ts`, keeping `schema.prisma` as the contract, CommonJS `tsconfig`, the baseline, retiring the old migration setup |
| `references/client-api-mapping.md` | Prisma ORM 6/7 calls to Prisma 8, and the differences that break rewrites |
| `references/compute-setup-pr-fixes.md` | What the Console's setup pull request gets wrong, and the files to write without one |
| `references/verify-upgrade-checklist.md` | Proving the upgrade with the repo's own checks |

## Verified against

A Prisma ORM 6.19 app (Express 4, EJS, `tsc`, CommonJS) on PostgreSQL 18, with `prisma`
8.0.0-rc.27, `@prisma/orm-postgres` 8.0.0-rc.20 and Composer 0.34.0. An agent with only this
skill upgraded it with no setup pull request: pages and API output were identical before and
after against the same database, and `npx prisma dev module.mjs` reached `dev: ready`. The
Console flow and the Compute runtime were not deployed end to end.

## Hand-off rule

Once the app runs on Prisma 8, use the synced `prisma-8` skill for day-to-day work and
`prisma-compute` for deploy operations. This skill covers the upgrade only.
