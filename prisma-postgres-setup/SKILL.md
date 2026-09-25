---
name: prisma-postgres-setup
description: Obtain or reuse a Prisma Postgres database and connect an application. Use for "set up Prisma Postgres", "connect my app to Prisma Postgres", or Prisma Postgres setup in v0 and Vercel Marketplace. Defaults new ORM setups to Prisma ORM 8; preserves an existing application or an explicit ORM, driver, or database-only choice.
license: MIT
metadata:
  author: prisma
  version: "2.0.0"
---

# Prisma Postgres setup

Connect the intended database, then verify it from the application. Keep provisioning separate from ORM configuration so an existing database is reused.

## 1. Inspect the project

Check the user's requested ORM or driver, installed packages, database connection, and environment-loading files. Check secret presence without printing values.

- Default new ORM setups to **Prisma ORM 8**; preserve an existing application's ORM.
- Honor explicit choices such as Drizzle, `pg`, or database-only setup.
- For query or schema work in an already configured app, use its version-matched ORM guidance; do not restart setup.

## 2. Reuse or obtain a database

| Situation                                    | Action                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Existing connection or connected integration | Verify its project, database, and environment; reuse it.                                                         |
| v0 or Vercel Marketplace                     | Read [Marketplace setup](references/vercel-marketplace.md) and use the native integration flow.                  |
| Standalone persistent database               | Read [provisioning](references/provisioning.md); use an authenticated CLI, MCP tool, Console, or Management API. |
| Temporary development database requested     | Read the `create-db` section in [provisioning](references/provisioning.md), including expiry and claiming.       |

Resolve the workspace, project, and region before creation. If several resources fit, ask which one to use. Missing shell environment variables do not prove the database is missing. If provisioning is blocked by permissions or quota, report the blocker; do not delete another resource or switch workspaces to get around it.

## 3. Connect the application

Use the connection appropriate to the chosen driver and runtime. Store it in the project's secret environment configuration, never source code or chat. Preserve unrelated entries, update the intended variable once, and ensure local secret files are ignored by Git.

Application processes and CLI commands may load different environment files. For example, a framework may load `.env.development.local` while a shell command does not. Load the intended file for that command without displaying credentials or replacing the database.

## 4. Configure the ORM and verify

For Prisma ORM setup, load **`prisma-orm-setup`** using the host's skill loader or read its installed `SKILL.md`. If it is not installed, obtain it from [prisma/skills](https://github.com/prisma/skills/tree/main/prisma-orm-setup). It owns version selection and routes existing applications to the appropriate guidance. If that handoff is unavailable, report it. This skill does not own ORM configuration or migration recipes.

For an explicitly selected alternative, keep that ORM or driver and use its documented setup. For database-only setup, stop after verifying connectivity.

Run a read-only query against the intended database through the application's chosen ORM or driver. Report what was connected, the selected ORM/version, and the query result without secrets. If any step is blocked or untested, say so instead of claiming setup is complete.

For Studio, SDK integrations, or database operations beyond initial setup, read [operations](references/operations.md).
