# Prisma Skills

A collection of skills for AI coding agents working with Prisma ORM. Skills are packaged instructions that extend agent capabilities for database development.

Skills follow the [Agent Skills](https://agentskills.io/) format and are compatible with `npx add-skill`.

## Available Skills

### prisma-cli

Complete reference for Prisma CLI commands in Prisma ORM v7.

**Use when:**
- Running Prisma commands
- Setting up new projects (`prisma init`)
- Managing migrations and database schema
- Generating Prisma Client

**Commands covered:**
- `init`, `generate`, `dev` (local Prisma Postgres)
- `migrate dev`, `migrate deploy`, `migrate reset`
- `db push`, `db pull`, `db seed`, `db execute`
- `studio`

---

### prisma-upgrade-v7

Step-by-step migration guide from Prisma v6 to v7, covering all breaking changes.

**Use when:**
- Upgrading existing projects to Prisma 7
- Troubleshooting v7 compatibility issues
- Understanding what changed in v7

**Topics covered:**
- ESM module configuration
- Driver adapter requirements
- New `prisma.config.ts` file
- Manual environment variable loading
- Removed features (middleware, metrics, CLI flags)
- Special handling for Accelerate users

---

### prisma-client-api

Comprehensive Prisma Client API reference for v7.

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

## Installation

Install all skills:

```bash
npx add-skill prisma/skills
```

Or install specific skills:

```bash
npx add-skill prisma/skills --skill prisma-cli
npx add-skill prisma/skills --skill prisma-upgrade-v7
npx add-skill prisma/skills --skill prisma-client-api
npx add-skill prisma/skills --skill prisma-database-setup
```

List available skills:

```bash
npx add-skill prisma/skills --list
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
- `rules/` - Individual rule files with detailed explanations and code examples
- `metadata.json` - Version, author, and package information

## Prisma Version

These skills target **Prisma ORM v7.x**. Key v7 changes:
- ESM-first module system
- Driver adapters are required
- New `prisma.config.ts` configuration file
- Manual environment variable loading

For v6 projects, use the `prisma-upgrade-v7` skill to migrate.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and modifying skills.

## License

MIT
