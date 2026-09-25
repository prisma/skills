---
name: prisma-orm-setup
description: Set up a new Prisma ORM 8 application or finish an existing Prisma 8 setup, connect its database, and load the matching package-owned prisma-8 skill. Existing Prisma 6/7 connection repairs belong to prisma-database-setup.
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma ORM setup

Default new applications to **Prisma ORM 8**. Detailed configuration, queries, migrations, and runtime code belong to the versioned [prisma-8 skill](https://github.com/prisma/orm/tree/main/skills/prisma-8) shipped with the ORM package.

## 1. Detect the starting point

Read the package manifest, lockfile, Prisma configuration, and application imports. Identify the database provider and runtime.

- **Prisma 8 application:** keep the existing configuration and load its installed guidance below, without reinitializing.
- **Prisma 6/7 application or an explicit earlier-version choice:** load [prisma-database-setup](../prisma-database-setup/SKILL.md) for setup or connection work. A Prisma 8 CLI can coexist with a legacy client; inspect `@prisma/client`, `@prisma/prisma7`, and schema/configuration. Do not make a major upgrade a prerequisite for repairing a connection.
- **New application without a version choice:** check the selected Prisma 8 release's [provider support](https://www.prisma.io/docs/orm/supported-databases) and runtime requirements before installing. If unsupported, explain the limitation and offer an explicitly selected earlier-version path through `prisma-database-setup`. Keep the requested database; do not silently fall back or invent a supported target.

Use an existing database when supplied. Load `prisma-postgres-setup` only when Prisma Postgres is needed and no connection has been selected yet; return here once connected.

## 2. Handle requested major upgrades separately

When the user requests a major upgrade, load a workflow that supports the source version and provider. For PostgreSQL 7-to-8, use the [Prisma migration guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql); for MongoDB 6-to-8, use [prisma-mongodb-upgrade](../prisma-mongodb-upgrade/SKILL.md). Other providers need an explicitly supported migration path. `prisma-upgrade-v7` covers **6 to 7**; the package-owned `prisma-8` upgrade reference covers updates within 8.

## 3. Bootstrap a new Prisma 8 application

Check the selected release's [runtime requirements](https://www.prisma.io/docs/orm/release-status) and [initialization guide](https://www.prisma.io/docs/cli/orm-init). Resolve and pin a published Prisma CLI **8** release, including its prerelease suffix if needed; verify its version before initialization. Do not rely on a floating `latest` remaining version 8.

Use the project's package manager to run the installed CLI. For PostgreSQL and Prisma schema language authoring:

```bash
prisma orm init --yes --target postgres --authoring psl
```

Use the supported target for the selected provider. Preserve existing application files and connection configuration; do not let setup provision an unrelated database. Verify that the resolved ORM package is version 8 before proceeding.

## 4. Load the installed ORM guidance

Run the installed CLI through the project's package manager:

```bash
prisma skills sync
```

Then **read** the synced `prisma-8/SKILL.md`, for example `.agents/skills/prisma-8/SKILL.md`, and follow its preconditions and selected references. Syncing alone does not load the instructions. If the package-owned guidance cannot be loaded, report the blocker.

## 5. Verify the application

Follow the loaded guidance for configuration, schema changes, and runtime code. Load the intended environment for both the CLI and application without printing secrets. Run the project's relevant checks and a read-only query through the application against the intended database.

Report the ORM version, loaded skill version, and verified query result. Package installation or successful skill sync alone is not a completed setup.
