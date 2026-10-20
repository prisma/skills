# Prisma Skills

A collection of skills for AI coding agents working with Prisma ORM, Prisma Postgres and Prisma Compute. Skills are packaged instructions that extend agent capabilities for database development and app deployment.

Skills follow the [Agent Skills](https://agentskills.io/) format and are compatible with `npx skills add`.

## Available Skills

### prisma-cli

Reference for Prisma ORM 7 CLI commands. For Prisma Compute app deployment, use `prisma-compute`.

**Use when:**
- Running Prisma ORM 7/database commands
- Setting up explicitly selected Prisma 7 projects (`prisma init`)
- Managing migrations and database schema
- Generating Prisma Client

**Commands covered:**
- `init`, `generate`, `dev` (local Prisma Postgres)
- `migrate dev`, `migrate deploy`, `migrate reset`
- `db push`, `db pull`, `db seed`, `db execute`
- `studio`, `mcp`

---

### prisma-upgrade-v7

Step-by-step migration guide from Prisma v6 to v7, covering all breaking changes.

**Use when:**
- Upgrading existing projects to Prisma 7
- Troubleshooting v7 compatibility issues
- Understanding what changed in v7

**Topics covered:**
- ESM-first module configuration plus CommonJS fallback
- Driver adapter requirements
- New `prisma.config.ts` file
- Manual environment variable loading
- Generated client entrypoints (`client`, `browser`, `models`, `enums`)
- `Prisma.validator` to `satisfies` migration
- Removed features (middleware, metrics, CLI flags)
- Special handling for Accelerate users

---

### prisma-mongodb-upgrade

Decision and migration guide for MongoDB projects on Prisma v6, which have no path to Prisma 7.

**Use when:**
- A MongoDB project asks about upgrading Prisma versions
- Evaluating a move from Prisma v6 to Prisma 8
- Preventing an impossible "upgrade MongoDB to v7" plan

**Topics covered:**
- The version landscape (v6 terminal for MongoDB; v7 has no connector; Prisma 8 is the successor path)
- Stay-on-v6 vs migrate-now decision table with no-go signals
- Schema/contract, client API, and migrations mapping between v6 and Prisma 8
- No-data-moves cutover verification checklist

---

### prisma-client-api

Comprehensive Prisma Client API reference.

**Use when:**
- Writing Prisma Client queries
- Understanding query options (select, include, where)
- Working with transactions
- Using raw SQL queries

**Topics covered:**
- PrismaClient constructor and configuration
- CRUD operations (findMany, create, update, delete)
- Query options (select, include, omit, orderBy, pagination)
- Filter operators and conditions
- Transactions ($transaction)
- Raw queries ($queryRaw, $executeRaw)
- Client methods ($connect, $disconnect, $extends)

---

### prisma-driver-adapter-implementation

Implementation guide for Prisma SQL driver adapter development.

**Use when:**
- Implementing a new SQL driver adapter
- Modifying `SqlDriverAdapter` or `Transaction` behavior
- Wiring migration-aware adapter factories
- Debugging adapter type mapping or transaction issues

**Topics covered:**
- Required adapter interfaces and contracts
- Transaction lifecycle protocol (including nested transactions)
- `SqlQuery` argument mapping and `SqlResultSet` mapping
- `ColumnTypeEnum` mapping strategy
- Error conversion to `DriverAdapterError` / `MappedError`
- Unit and E2E verification checklist

---

### prisma-orm-setup

Set up an application with **Prisma ORM 8** using the version-matched `prisma-8` skill shipped by [prisma/orm](https://github.com/prisma/orm/tree/main/skills).

Also keeps existing Prisma 6/7 applications on their version, with provider references for Prisma 7 SQL (PostgreSQL, MySQL, SQLite, SQL Server, CockroachDB, Prisma Postgres) and Prisma 6 MongoDB.

**Use when:** setting up Prisma in an application, connecting its database, or troubleshooting a connection. Major upgrades are separate tasks.

`prisma-database-setup` is a deprecated compatibility name that loads `prisma-orm-setup`.

### prisma-postgres-setup

Reuse or provision a Prisma Postgres database, connect it to the application, and verify a query. Hands Prisma ORM configuration to `prisma-orm-setup`, and honors explicit driver, alternative ORM, or database-only choices.

**Use when:** the user needs a database and has none yet ("I need a database"), runs `npx create-db`, or connects Prisma Postgres through v0/Vercel Marketplace, Console, Platform CLI, MCP, `create-db`, or the Management API. Marketplace guidance is a reference in this skill, not a separate skill. In a project that deploys to Vercel, the agent also suggests the [Vercel plugin](https://github.com/vercel/vercel-plugin) (`npx plugins add vercel/vercel-plugin`) and installs it only with the user's OK.

---

### prisma-compute

Deploy and operate apps on Prisma Compute with the Prisma 8 CLI. Every app deploys as a Prisma Composer app (`module.ts`), from a terminal with `prisma deploy` or on every push through `prisma/cloud-deploy-action`.

**Use when:**
- Deploying a new or existing app to Prisma Compute
- Porting a project from the removed `@prisma/cli app deploy`, `prisma.compute.ts`, or `compute:deploy` flow
- Setting up preview stages, deploy on push, or CI deploys
- Reading service logs, promoting, or rolling back versions
- Managing environment variables, custom domains, databases, and buckets for a Compute project
- Debugging failed deploys, unreachable services, 504s, or sleeping instances

**Workflows covered:**
- Composer app declaration: `module.ts`, `compute()`, build adapters per framework, and the `composer` section of `prisma.config.ts`
- `prisma dev` and `prisma deploy`, `--stage` previews, regions, and service-token CI
- Deploy on push with `prisma git connect` and `prisma/cloud-deploy-action`
- `prisma service` logs, versions, rollback, and domains; `prisma project env`
- Compute runtime limits: Bun, binding `0.0.0.0`, 60 seconds to first byte, `waitUntil` and `KeepAwakeGuard`
- `create-prisma` scaffolds, the REST API, and the Composer control API

## Installation

Install all skills:

```bash
npx skills add prisma/skills
```

Or install specific skills:

```bash
npx skills add prisma/skills --skill prisma-cli
npx skills add prisma/skills --skill prisma-upgrade-v7
npx skills add prisma/skills --skill prisma-mongodb-upgrade
npx skills add prisma/skills --skill prisma-client-api
npx skills add prisma/skills --skill prisma-driver-adapter-implementation
npx skills add prisma/skills --skill prisma-orm-setup
npx skills add prisma/skills --skill prisma-postgres-setup
npx skills add prisma/skills --skill prisma-compute
```

List available skills:

```bash
npx skills add prisma/skills --list
```

List installed skills:

```bash
npx skills list
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**
```
Help me run Prisma migrations in production
```
```
Upgrade my project from Prisma 6 to Prisma 7
```
```
How do I use transactions in Prisma?
```

## Skill Structure

Each skill contains:
- `SKILL.md` - Main instructions with YAML frontmatter (name, description, metadata)
- `references/` (optional) - Individual reference files with detailed explanations and code examples

## Prisma Version

New ORM setups default to **Prisma ORM 8**. Install `prisma-orm-setup` and `prisma-postgres-setup` for the default Prisma Postgres workflow. `prisma-orm-setup` also keeps existing Prisma 6/7 applications on their version; repairing a connection does not require an upgrade. Detailed Prisma 8 APIs come from the installed package-owned `prisma-8` skill after `prisma skills sync`.

The existing `prisma-cli`, `prisma-client-api`, driver adapter, and earlier-version upgrade skills retain their existing scope; do not use their legacy recipes for Prisma 8 setup.

The `prisma-compute` skill covers the Composer-based deploy flow of the Prisma 8 CLI. For API details it defers to the version-matched `prisma-platform-core-concepts` and `prisma-composer-core-concepts` skills, which `prisma skills sync` installs from the `prisma` and `@prisma/composer` packages.

If you're upgrading from Prisma 6, use the `prisma-upgrade-v7` skill for migration-specific guidance.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and modifying skills.

## License

MIT
