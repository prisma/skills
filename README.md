# Prisma Skills

A collection of skills for AI coding agents working with Prisma ORM. Skills are packaged instructions that extend agent capabilities for database development.

Skills follow the [Agent Skills](https://agentskills.io/) format and are compatible with `npx skills add`.

## Available Skills

### prisma-cli

Complete reference for current Prisma ORM CLI commands. For Prisma Compute app deployment, use `prisma-compute`.

**Use when:**
- Running Prisma ORM/database commands
- Setting up new projects (`prisma init`)
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

### prisma-database-setup

Guides for configuring Prisma with different database providers.

**Use when:**
- Setting up a new project with a specific database
- Connecting to PostgreSQL, MySQL, SQLite, MongoDB, etc.
- Troubleshooting connection issues
- Configuring connection strings

**Databases covered:**
- PostgreSQL & Prisma Postgres
- MySQL / MariaDB
- SQLite
- MongoDB
- SQL Server
- CockroachDB

---

### prisma-postgres

Prisma Postgres workflows across Console, `create-db`, Management API, and SDK integrations.

**Use when:**
- Setting up and managing Prisma Postgres in Prisma Console
- Creating instant databases with `npx create-db`
- Integrating programmatic provisioning with Management API
- Building typed API integrations using `@prisma/management-api-sdk`
- Handling auth, regions, claim flow, and connection details

**Workflows covered:**
- `npx create-db@latest`
- `npx create-db@latest create --help`
- `npx create-db@latest regions --help`
- Programmatic `create-db` usage (`create()` and `regions()`)
- Console operations (`https://console.prisma.io`)
- Management API (`https://api.prisma.io/v1`)
- Management API SDK (`@prisma/management-api-sdk`)

---

### prisma-compute

Prisma Compute deployment and hosting workflows centered on the Prisma Platform CLI, with `create-prisma` covered as the new-project scaffold path, plus framework readiness, SDK automation, and operational debugging.

**Use when:**
- Creating a new Prisma app with optional Compute deploy
- Deploying or redeploying an existing app to Prisma Compute
- Checking framework deploy readiness for Hono, Elysia, Next.js, TanStack Start, Astro, Nuxt, Svelte, Nest, or Turborepo
- Managing Compute app logs, deployments, environment variables, branches, and domains
- Building programmatic Compute integrations with SDK/API tooling

**Workflows covered:**
- `@prisma/cli app build/run/deploy`
- Generated `compute:deploy` scripts
- `create-prisma --deploy` for new project scaffolds
- Framework-specific build output requirements
- `@prisma/compute-sdk` and Management API service/version concepts
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
npx skills add prisma/skills --skill prisma-client-api
npx skills add prisma/skills --skill prisma-driver-adapter-implementation
npx skills add prisma/skills --skill prisma-database-setup
npx skills add prisma/skills --skill prisma-postgres
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

The ORM-focused skills target **Prisma ORM 7.6.x**.

The `prisma-compute` skill tracks the active Prisma Compute launch flow and instructs agents to verify the current Prisma Platform CLI and `create-prisma` command surfaces before acting.

If you're upgrading from Prisma 6, use the `prisma-upgrade-v7` skill for migration-specific guidance.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and modifying skills.

## License

MIT
