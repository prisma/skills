# Prisma Skills

A collection of skills for AI coding agents working with Prisma ORM. Each skill is a self-contained package that extends agent capabilities for database development.

Skills follow the [Agent Skills](https://agentskills.io/) format and are compatible with `npx add-skill`.

## Available Skills

Skills are granular: one per CLI command, API area, database, or upgrade topic. Install all or pick specific ones.

### CLI (`prisma-cli-*`)

| Skill | Use when |
|-------|----------|
| `prisma-cli-init` | Setting up a new Prisma project |
| `prisma-cli-generate` | Generating Prisma Client |
| `prisma-cli-dev` | Using local Prisma Postgres for development |
| `prisma-cli-db-pull` | Introspecting schema from a database |
| `prisma-cli-db-push` | Pushing schema without migrations |
| `prisma-cli-db-seed` | Seeding the database |
| `prisma-cli-db-execute` | Running raw SQL files |
| `prisma-cli-migrate-dev` | Creating and applying migrations in development |
| `prisma-cli-migrate-deploy` | Deploying migrations in production |
| `prisma-cli-migrate-reset` | Resetting database and reapplying migrations |
| `prisma-cli-migrate-status` | Checking migration status |
| `prisma-cli-migrate-resolve` | Resolving migration history issues |
| `prisma-cli-migrate-diff` | Generating schema diffs |
| `prisma-cli-studio` | Using Prisma Studio (database GUI) |
| `prisma-cli-validate` | Validating schema |
| `prisma-cli-format` | Formatting schema |
| `prisma-cli-debug` | Getting debug information |

### Client API (`prisma-client-api-*`)

| Skill | Use when |
|-------|----------|
| `prisma-client-api-constructor` | Configuring and instantiating Prisma Client |
| `prisma-client-api-model-queries` | CRUD operations (findMany, create, update, delete) |
| `prisma-client-api-query-options` | select, include, omit, orderBy, pagination |
| `prisma-client-api-filters` | Filter conditions and operators |
| `prisma-client-api-relations` | Relation queries and nested operations |
| `prisma-client-api-transactions` | Transactions ($transaction) |
| `prisma-client-api-raw-queries` | $queryRaw, $executeRaw |
| `prisma-client-api-client-methods` | $connect, $disconnect, $on, $extends |

### Database setup (`prisma-database-setup-*`)

| Skill | Use when |
|-------|----------|
| `prisma-database-setup-prisma-client-setup` | Installing and generating Prisma Client (any DB) |
| `prisma-database-setup-postgresql` | Connecting to PostgreSQL |
| `prisma-database-setup-mysql` | Connecting to MySQL / MariaDB |
| `prisma-database-setup-sqlite` | Connecting to SQLite |
| `prisma-database-setup-prisma-postgres` | Connecting to Prisma Postgres (cloud) |
| `prisma-database-setup-sqlserver` | Connecting to SQL Server |
| `prisma-database-setup-cockroachdb` | Connecting to CockroachDB |
| `prisma-database-setup-mongodb` | Connecting to MongoDB (v6; v7 not yet supported) |

### Upgrade to v7 (`prisma-upgrade-v7-*`)

| Skill | Use when |
|-------|----------|
| `prisma-upgrade-v7-esm-support` | Configuring ESM for Prisma 7 |
| `prisma-upgrade-v7-schema-changes` | Updating generator and schema for v7 |
| `prisma-upgrade-v7-driver-adapters` | Setting up required driver adapters |
| `prisma-upgrade-v7-prisma-config` | Creating and using prisma.config.ts |
| `prisma-upgrade-v7-env-variables` | Loading environment variables in v7 |
| `prisma-upgrade-v7-removed-features` | Middleware, metrics, CLI flags removed in v7 |
| `prisma-upgrade-v7-accelerate-users` | Upgrading projects using Prisma Accelerate |

## Installation

Install all skills:

```bash
npx add-skill prisma/skills
```

Or install specific skills:

```bash
npx add-skill prisma/skills --skill prisma-cli-migrate-dev
npx add-skill prisma/skills --skill prisma-client-api-transactions
npx add-skill prisma/skills --skill prisma-database-setup-postgresql
npx add-skill prisma/skills --skill prisma-upgrade-v7-driver-adapters
```

List available skills:

```bash
npx add-skill prisma/skills --list
```

## Testing in a local project

To try the skills while working on a Prisma app:

1. **Install skills** (pick one method):

   - **From this repo (local clone)** — install one or all skills from the repo path:
     ```bash
     # From the directory that contains your Prisma app (or any directory)
     npx add-skill /path/to/prisma/skills
     # Or a single skill
     npx add-skill /path/to/prisma/skills --skill prisma-cli-migrate-dev
     ```
   - **Manual install** — copy the skill directory into your agent’s skills folder:
     - **Cursor:** `~/.cursor/skills/` (create it if needed)
     - **Claude Code:** `~/.claude/skills/`
     - **OpenCode:** `~/.config/opencode/skill/`
     ```bash
     # Example: copy one skill for Cursor
     cp -r /path/to/prisma/skills/skills/prisma-cli-migrate-dev ~/.cursor/skills/
     # Or copy all skills
     cp -r /path/to/prisma/skills/skills/* ~/.cursor/skills/
     ```

2. **Open your Prisma project** in the same editor/agent (e.g. open your app repo in Cursor).

3. **Trigger the agent** with Prisma-related questions or tasks, for example:
   - “How do I run migrations in production?”
   - “Add a Prisma transaction for creating a user and their profile.”
   - “Set up Prisma with PostgreSQL and a driver adapter.”

The agent will load the relevant skill(s) by name/description and use the content from `SKILL.md` when answering.

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

## Repository Structure

Skills live under a single `skills/` directory. Each skill is a directory with no sub-rules:

```
skills/
  prisma-cli-init/
  prisma-cli-generate/
  prisma-client-api-transactions/
  prisma-database-setup-postgresql/
  prisma-upgrade-v7-driver-adapters/
  ...
```

## Skill Structure

Each skill contains:
- `SKILL.md` — Instructions with YAML frontmatter (name, description, metadata) and full content
- `metadata.json` — Version, author, and package information

There is no `rules/` directory; each skill is self-contained in `SKILL.md`.

## Prisma Version

These skills target **Prisma ORM v7.x**. Key v7 changes:
- ESM-first module system
- Driver adapters are required
- New `prisma.config.ts` configuration file
- Manual environment variable loading

For v6 projects, use the `prisma-upgrade-v7-*` skills to migrate.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on creating and modifying skills.

## License

MIT
