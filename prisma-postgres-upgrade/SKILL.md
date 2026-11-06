---
name: prisma-postgres-upgrade
description: Upgrade a PostgreSQL app from Prisma ORM 6 or 7 straight to Prisma 8 and deploy it on Prisma Compute, keeping the existing schema.prisma, database and data. Use when a Postgres project on Prisma 6 or 7 wants Prisma 8, Prisma Compute, or the Console's "Set up Prisma Cloud deploys" pull request. Triggers on "upgrade prisma 6 to 8", "upgrade prisma 7 to 8", "upgrade to prisma 8 postgres", "move my prisma app to prisma compute", "prisma7Schema", "migrations/app", "service.load().db.client", "@prisma/client did not initialize yet".
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma Postgres Upgrade: Prisma ORM 6 or 7 to Prisma 8 on Compute

Move a Node.js server on Prisma ORM 6 or 7 and PostgreSQL to Prisma 8 in one pass, then deploy
it on Prisma Compute through the Console's setup pull request. The schema, the database and its
data stay. At the end, Prisma 8 owns migrations, every query runs through the Prisma 8 client,
and a push deploys the app with its own Prisma Postgres database.

The [Prisma ORM 6 or 7 to 8 on Prisma Compute (PostgreSQL) guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute)
is the source of truth. Follow its steps in order; this skill adds the rules an agent needs and
the pitfalls found while validating it.

**Never do either of these:**

- Never route a PostgreSQL Prisma ORM 6 app through Prisma ORM 7 first. Prisma 8 reads a
  Prisma ORM 6 `schema.prisma` unchanged, so `prisma-upgrade-v7` is only for apps that stay on 7.
- Never install `prisma@latest` or `@prisma/orm-postgres@latest` while the Console's Compute
  setup pins versions: the setup keeps whatever versions `package.json` declares, and the
  latest pair does not work with the Composer version it installs, so the deploy fails.

## When to Apply

- A PostgreSQL project on Prisma ORM 6 or 7 asks to upgrade to Prisma 8
- The user wants to deploy a Prisma ORM 6 or 7 app on Prisma Compute
- The Console opened **Set up Prisma Cloud deploys** on a branch named `prisma-cloud/setup`
- A fresh install fails with `@prisma/client did not initialize yet` after the CLI switched to 8

Not for: MongoDB (use `prisma-mongodb-upgrade`), a Prisma ORM 7 app moving one route at a time
beside Prisma 8 (follow the [side-by-side guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql)),
or a new project (use `prisma-orm-setup`).

## Pinned versions

Install exactly these, with `--save-exact`:

| Package | Version | Where |
|---------|---------|-------|
| `prisma` | `8.0.0-rc.27` | `devDependencies` |
| `@prisma/orm-postgres` | `8.0.0-rc.20` | `dependencies` |

They are `PRISMA_CLI_VERSION` and `ORM_POSTGRES_VERSION` in the Console's Compute setup. When
the setup pull request in the repository lists other versions, use those. Prisma 8 needs
Node.js 22.18+, but `prisma dev` needs Node.js 24.11+, so use 24.11+ throughout.

## The path

| Step | What happens | Reference |
|------|--------------|-----------|
| 0 | Record the baseline: run the repo's own checks before any change | `verify-upgrade-checklist` |
| 1 | `npm uninstall prisma`, install the pins, remove `prisma generate` from scripts | this file |
| 2 | `prisma.config.ts` with `prisma7Schema(...)`, `contract emit`, `db sign` | `schema-contract-mapping` |
| 3 | `migration plan --name init` into `migrations/app/`, delete `prisma/migrations` | `migrations-mapping` |
| 4 | `tsconfig.json`: `nodenext`, `resolveJsonModule` | `schema-contract-mapping` |
| 5 | Prisma 8 client from `DATABASE_URL`, rewrite every query | `client-api-mapping` |
| 6 | Console setup PR, then fix it: service in the build, `service.load().db.client` | `compute-setup-pr-fixes` |
| 7 | Remove `@prisma/client`, the adapter and the generated client | this file |
| 8 | Run the same checks again and start the app | `verify-upgrade-checklist` |

After step 2 writes `prisma.config.ts`, run `npx prisma skills sync`. It installs the
version-matched `prisma-8` and `prisma-platform-core-concepts` skills from the installed
packages; with a Prisma ORM 7 config still in place it fails with `CLI.CONFIG_UNREADABLE`. Run
it again after step 6 to add `prisma-composer-core-concepts`. Use them for API details from
then on.

Step 1 removes the only command that generated the old client. The generated client on disk
keeps working locally, but a fresh install (CI, a new clone) has none, so rewrite every query
before pushing to a branch that CI builds. Prisma 8 has no `generate` and no seed command:
`prisma generate` exits 2 with `CLI.UNKNOWN_COMMAND`, so strip it from `build` and
`postinstall`.

## What the user does

The agent cannot do these; stop and ask the user:

- Connect the repository in the [Prisma Console](https://console.prisma.io), which opens the
  setup pull request.
- Provide the values for environment variables the app reads (`prisma project env add`).
- Approve the push to `prisma-cloud/setup`. Every push deploys a preview, and merging the
  pull request deploys production.

## Reference files

| Reference | What it covers |
|-----------|----------------|
| `references/schema-contract-mapping.md` | `prisma.config.ts`, `prisma7Schema` on a 6 or 7 schema, emit, sign, tsconfig |
| `references/client-api-mapping.md` | Prisma ORM 6/7 calls to Prisma 8, and the rc.20 gotchas |
| `references/migrations-mapping.md` | Baseline in `migrations/app/`, retiring `prisma/migrations`, the change loop |
| `references/compute-setup-pr-fixes.md` | The edits the Console's setup pull request needs before it deploys |
| `references/verify-upgrade-checklist.md` | Proving the upgrade with the repo's own checks |

## Verified against

A Prisma ORM 6.19 app (Express 4, EJS, `tsc`, CommonJS) on PostgreSQL 18, with `prisma`
8.0.0-rc.27, `@prisma/orm-postgres` 8.0.0-rc.20, and `@prisma/composer` /
`@prisma/composer-prisma-cloud` 0.34.0. Steps 1 to 5 and 7 ran end to end, and step 6 ran
locally under `prisma dev`. The Console flow and the Compute runtime were not deployed: those
parts follow the Console's setup code and the Composer types. Before acting on a version-specific
claim, check the installed versions (`npm ls prisma @prisma/orm-postgres`).

## Hand-off rule

Once the app runs on Prisma 8, follow the synced `prisma-8` skill for day-to-day work and
`prisma-compute` for deploy operations. This skill covers the upgrade only.
