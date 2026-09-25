# Prisma Skills

A collection of skills for AI coding agents working with Prisma ORM. Skills are packaged instructions that extend agent capabilities for database development.

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
- Evaluating a move from Prisma v6 to Prisma Next
- Preventing an impossible "upgrade MongoDB to v7" plan

**Topics covered:**

- The version landscape (v6 terminal for MongoDB; v7 has no connector; Prisma Next is the successor path)
- Stay-on-v6 vs migrate-now decision table with no-go signals
- Schema/contract, client API, and migrations mapping between v6 and Prisma Next
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

**Use when:** setting up a new Prisma 8 application or finishing a Prisma 8 setup. Existing Prisma 6/7 connection work routes to `prisma-database-setup`; major upgrades are separate tasks.

### prisma-database-setup

Database setup and connection troubleshooting for **Prisma 7 SQL** and **Prisma 6 MongoDB**, with environment configuration, provider prerequisites, connection strings, runtime drivers, and common errors. Existing Prisma 6 SQL apps retain their version and use the linked Prisma 6 documentation.

**Use when:** configuring an existing Prisma 6/7 app or explicitly choosing an earlier version for new setup. New applications otherwise default to `prisma-orm-setup`.

### prisma-postgres-setup

Reuse or provision a Prisma Postgres database, connect it to the application, and verify a query. Defaults new ORM setups to **Prisma ORM 8**, while preserving existing applications and explicit ORM, driver, or database-only choices.

**Use when:** connecting Prisma Postgres through v0/Vercel Marketplace, Console, Platform CLI, MCP, `create-db`, or the Management API. Marketplace guidance is a reference in this skill, not a separate skill.

---

### prisma-compute

Prisma Compute deployment and hosting workflows centered on the Prisma Platform CLI, with `create-prisma` covered as the new-project scaffold path, plus framework readiness, SDK automation, and operational debugging.

**Use when:**

- Creating a new Prisma app with optional Compute deploy
- Deploying or redeploying an existing app to Prisma Compute
- Checking framework deploy readiness for Hono, Elysia, Next.js, TanStack Start, Astro, Nuxt, Svelte, Nest, Turborepo, or custom/prebuilt artifacts
- Managing Compute app logs, deployments, environment variables, branches, and domains
- Building programmatic Compute integrations with SDK/API tooling

**Workflows covered:**

- `@prisma/cli app build/run/deploy`
- Generated `compute:deploy` scripts
- `create-prisma --deploy` for new project scaffolds
- Framework-specific build output requirements
- `@prisma/compute-sdk` and Management API App/Deployment concepts
- Troubleshooting auth, env, build, deploy, log, and port issues

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
npx skills add prisma/skills --skill prisma-database-setup
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

New ORM setups default to **Prisma ORM 8**. Install `prisma-orm-setup` and `prisma-postgres-setup` for the default Prisma Postgres workflow. `prisma-database-setup` retains the Prisma 6/7 configuration paths; repairing an existing connection does not require an upgrade. Detailed Prisma 8 APIs come from the installed package-owned `prisma-8` skill after `prisma skills sync`.

The existing `prisma-cli`, `prisma-client-api`, driver adapter, and earlier-version upgrade skills retain their existing scope; do not use their legacy recipes for Prisma 8 setup.

The `prisma-compute` skill tracks the active Prisma Compute launch flow and instructs agents to verify the current Prisma Platform CLI and `create-prisma` command surfaces before acting.

If you're upgrading from Prisma 6, use the `prisma-upgrade-v7` skill for migration-specific guidance.

## Marketplace distribution

Publishers must include the Postgres references and the ORM setup handoff, including `prisma-database-setup` for existing applications. Verify that v0 can load these and the package-owned `prisma-8` skill before releasing updated Marketplace content. A GitHub update alone does not prove that v0 refreshed its registered skill or can resolve sibling skills.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and modifying skills.

## License

MIT
