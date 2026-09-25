---
name: prisma-database-setup
description: Configure databases and troubleshoot connections in existing Prisma 6 or 7 applications, or set up a database with an explicitly selected earlier ORM version. Covers Prisma 7 SQL providers and Prisma 6 MongoDB. For default new Prisma 8 setup, use prisma-orm-setup.
license: MIT
metadata:
  author: prisma
  version: "7.10.0"
---

# Database setup for Prisma 6 and 7

Preserve the application's ORM version and intended database. A connection repair does not require a major upgrade.

## Select the matching guidance

Read the installed client version, schema, configuration, and runtime. The CLI version alone does not identify the application's ORM version.

- **Prisma 7 SQL:** use the provider reference below and [client setup](references/prisma-client-setup.md).
- **Prisma 6 MongoDB:** use [MongoDB setup](references/mongodb.md). SQL driver adapters do not apply.
- **Prisma 6 SQL:** preserve its generator, schema URL, and client initialization. Use the provider's connection details below and the [Prisma 6 documentation](https://www.prisma.io/docs/orm/v6); do not copy the Prisma 7 configuration or adapter examples into it.
- **New setup without an explicit earlier-version choice, or Prisma 8:** load [prisma-orm-setup](../prisma-orm-setup/SKILL.md).

For a new setup that explicitly selects Prisma 7 SQL or Prisma 6 MongoDB, pin packages to that major and use its runtime requirements. Keep the CLI, client, and SQL adapter releases compatible. Existing dependencies need not change for a connection repair.

| Database                         | Reference                                        |
| -------------------------------- | ------------------------------------------------ |
| PostgreSQL                       | [PostgreSQL](references/postgresql.md)           |
| MySQL / MariaDB / PlanetScale    | [MySQL](references/mysql.md)                     |
| SQLite / Turso                   | [SQLite](references/sqlite.md)                   |
| Microsoft SQL Server / Azure SQL | [SQL Server](references/sqlserver.md)            |
| CockroachDB                      | [CockroachDB](references/cockroachdb.md)         |
| MongoDB / Atlas on Prisma 6      | [MongoDB](references/mongodb.md)                 |
| Prisma Postgres with Prisma 7    | [Prisma Postgres](references/prisma-postgres.md) |

## Connect and verify

Reuse the intended database. Check the CLI and application's environment loading separately; a missing shell variable does not mean the database is missing. Keep credentials in ignored environment files or the host's secret configuration, without printing them. For SQL adapters, ensure their runtime options address the same database as the CLI connection URL.

For an existing app, preserve schema, migrations, and generator configuration unless the requested work requires changes. Diagnose the connection before running schema-changing commands. Verify with a read-only query through the application's client, then report the ORM version and result.
