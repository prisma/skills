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
data stay.

This skill is the bridge. It covers only what is specific to leaving Prisma ORM 6 or 7 and
landing on Compute. Prisma 8 itself (the contract, migrations, queries, errors) is covered by the
`prisma-8` skill that ships inside `@prisma/orm-postgres`: install it with `npx prisma skills sync`
as soon as step 2 is done, and follow it for anything Prisma 8 specific. It matches the
installed version; this skill does not.

The [Prisma ORM 6 or 7 to 8 on Prisma Compute (PostgreSQL) guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute)
is the source of truth for the steps.

**Never do either of these:**

- Never route a PostgreSQL Prisma ORM 6 app through Prisma ORM 7 first. Prisma 8 reads a
  Prisma ORM 6 `schema.prisma` unchanged, so `prisma-upgrade-v7` is only for apps that stay on 7.
- Never install `prisma@latest` or `@prisma/orm-postgres@latest` while the Console's Compute
  setup pins versions: the latest pair does not work with the Composer version the setup
  installs, so the deploy fails.

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
`8.0.0-rc.27` (dev dependency) and `@prisma/orm-postgres` `8.0.0-rc.20`. If the repository
already has a setup pull request, or the Console's message names other versions, use those.
Use Node.js 24.11 or newer; `prisma dev` needs it.

## The path

| Step | What happens | Where the detail is |
|------|--------------|---------------------|
| 0 | Run the repo's own checks and record the results | `verify-upgrade-checklist` |
| 1 | Remove `prisma`, install the versions above | this file |
| 2 | Prisma 8 `prisma.config.ts` reading the existing schema, `contract emit`, `db sign` | `adopt-schema-and-migrations` |
| 2b | `npx prisma skills sync`; from here, use the `prisma-8` skill for Prisma 8 details | `prisma-8` |
| 3 | Baseline migration, retire `prisma/migrations` | `adopt-schema-and-migrations` |
| 4 | Rewrite every query for the Prisma 8 client | `client-api-mapping` |
| 5 | Console setup pull request, then what it gets wrong | `compute-setup-pr-fixes` |
| 6 | Remove `@prisma/client`, the adapter and the generated client | this file |
| 7 | Run the same checks again and start the app | `verify-upgrade-checklist` |

Step 1 removes the only command that generated the old client. It keeps working locally, but a
fresh install (CI, a new clone) has none, so finish step 4 before pushing to a branch CI builds.
`npx prisma skills sync` fails with `CLI.CONFIG_UNREADABLE` while a Prisma ORM 7
`prisma.config.ts` is still in place, which is why it waits for step 2. Run it again after
step 5 to add the Composer skill.

## What the user does

The agent cannot do these; stop and ask:

- Connect the repository in the [Prisma Console](https://console.prisma.io), which opens the
  setup pull request.
- Provide values for the environment variables the app reads (`prisma project env add`).
- Approve the push to `prisma-cloud/setup`. Every push deploys a preview; merging deploys
  production.

## Reference files

| Reference | What it covers |
|-----------|----------------|
| `references/adopt-schema-and-migrations.md` | Keeping `schema.prisma` as the contract, CommonJS `tsconfig`, the baseline, retiring the old migration setup |
| `references/client-api-mapping.md` | Prisma ORM 6/7 calls to Prisma 8, and four differences that break rewrites |
| `references/compute-setup-pr-fixes.md` | What the Console's setup pull request currently gets wrong |
| `references/verify-upgrade-checklist.md` | Proving the upgrade with the repo's own checks |

## Verified against

A Prisma ORM 6.19 app (Express 4, `tsc`, CommonJS) on PostgreSQL 18, with `prisma`
8.0.0-rc.27, `@prisma/orm-postgres` 8.0.0-rc.20 and Composer 0.34.0, run locally under
`prisma dev`. The Console flow and the Compute runtime were not deployed end to end.

## Hand-off rule

Once the app runs on Prisma 8, use the synced `prisma-8` skill for day-to-day work and
`prisma-compute` for deploy operations. This skill covers the upgrade only.
