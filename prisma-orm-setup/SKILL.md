---
name: prisma-orm-setup
description: Set up an application with Prisma ORM 8, connect an existing database, and load the matching package-owned Prisma 8 skill. Use for new Prisma ORM setup or connection configuration. Route Prisma 7 and earlier projects to an upgrade workflow before setup changes; do not use for routine queries in an already configured app.
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma ORM setup

Target **Prisma ORM 8**. Detailed configuration, queries, migrations, and runtime code belong to the versioned [prisma-8 skill](https://github.com/prisma/orm/tree/main/skills/prisma-8) shipped with the ORM package.

## 1. Detect the starting point

Read the package manifest, lockfile, Prisma configuration, and existing application imports. Identify the database provider and runtime.

- **Prisma 8 application:** resolve the installed `@prisma/orm-*` version and keep the existing configuration. Continue with skill loading below, without reinitializing.
- **Prisma 7 or earlier, including mixed projects:** use the upgrade handoff below. Inspect `@prisma/client`, `@prisma/prisma7`, and legacy schema/configuration; a Prisma 8 CLI can coexist with a legacy application.
- **New Prisma application:** check provider and runtime support for the chosen Prisma 8 release before installing anything. Do not assume that all Prisma 7 providers are supported in 8, switch providers, or fall back to 7.

Use an existing database when supplied. Load `prisma-postgres-setup` only when Prisma Postgres is needed and no connection has been selected yet; return here once connected.

## 2. Hand off earlier versions

Discover and load a dedicated upgrade skill that explicitly supports the detected source version and provider. Invoke it for assessment, then follow its migration workflow and the user's scope before changing dependencies, schema, or data. Continue setup only after it establishes a compatible Prisma 8 application.

If no applicable skill is available, explain the gap and propose a separate upgrade using the [Prisma ORM 7-to-8 migration guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql) for PostgreSQL projects. Do not invent a skill name. `prisma-upgrade-v7` upgrades **6 to 7**, and the package-owned `prisma-8` upgrade reference upgrades existing Prisma 8 releases; neither is a 7-to-8 migration skill.

If an upgrade is not yet authorized, stop setup at the upgrade proposal. If the user declines it, preserve the project and explain the Prisma 8-only scope. Do not continue with a plan to finish Prisma 7 setup or obtain legacy setup recipes elsewhere. Earlier source versions or other providers require a migration path that explicitly supports them.

## 3. Bootstrap a new Prisma 8 application

Check the selected release's [runtime requirements](https://www.prisma.io/docs/orm/release-status) and [initialization guide](https://www.prisma.io/docs/cli/orm-init). Resolve and pin a published Prisma CLI **8** release, including its prerelease suffix if needed; verify its version before initialization. Do not rely on a floating `latest` remaining version 8.

Use the project's package manager to run the installed CLI. For example, with PostgreSQL and Prisma schema language authoring:

```bash
prisma orm init --yes --target postgres --authoring psl
```

Use the supported target for the selected provider. Preserve existing application files and connection configuration; do not let setup provision an unrelated database. Verify that the resolved ORM package is version 8 before proceeding.

## 4. Load the installed ORM guidance

Run the installed CLI through the project's package manager:

```bash
prisma skills sync
```

Then **read** the generated `prisma-8/SKILL.md`, for example `.agents/skills/prisma-8/SKILL.md`, and the references it selects for the task. Syncing alone does not load the instructions.

Match `metadata.library_version` to the resolved installed `@prisma/orm-*` package version, including prerelease suffixes. The CLI and ORM packages have independent version numbers; they need not match each other. Resync and reread stale guidance. If package-owned guidance is unavailable, a source fallback must match that ORM release, not floating `main`; report a blocker if no matching copy can be loaded.

## 5. Verify the application

Follow the loaded guidance for configuration, schema changes, and runtime code. Load the intended environment for both the CLI and application without printing secrets. Run the project's relevant checks and a read-only query through the application against the intended database.

Report the ORM version, loaded skill version, and verified query result. An upgrade proposal, package installation, or successful skill sync alone is not a completed setup.
