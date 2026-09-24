# Setup skill consolidation

There are two setup workflows: `prisma-orm-setup` configures an application with Prisma ORM 8; `prisma-postgres-setup` obtains or reuses a database and defaults to that ORM workflow. Explicit requests for Drizzle, another driver, or database-only setup take priority.

## What moved

| Previous content                                                                                    | Destination                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `prisma-database-setup`: project and provider detection, runtime checks, connection troubleshooting | `prisma-orm-setup`; verify support for the selected Prisma 8 release.                                  |
| Provider-specific recipes and duplicated client setup in all three skills                           | Replaced by the installed, version-matched `prisma-8` skill from `prisma/orm`; legacy recipes removed. |
| `prisma-postgres`: Console, connection selection, Platform CLI, temporary `create-db` provisioning  | Postgres setup and its `provisioning.md` reference.                                                    |
| Management API, SDK, auth, pagination, readiness polling, regions, and error handling               | Postgres `provisioning.md` and `operations.md`; current schemas/types own exact API contracts.         |
| Studio and ongoing database management                                                              | Postgres `operations.md`.                                                                              |
| v0 native integration, MCP scope, and injected environments                                         | Postgres `vercel-marketplace.md`; no separate Marketplace skill.                                       |

Prisma 7 and earlier require an upgrade handoff before setup changes. There is currently no dedicated relational 7-to-8 skill in these repositories. Discover a supported workflow, or propose the official provider-specific migration guide separately. Do not substitute the 6-to-7 skill or the Prisma 8 release-update instructions.

## Compatibility and distribution

The old `prisma-database-setup` and `prisma-postgres` names are small deprecated forwarding entries so existing explicit callers still resolve. They contain no independent setup instructions. Keep them until consumers have moved to the new names.

Before publishing, verify that each consumer can load the Postgres references, the ORM setup handoff, and the package-owned Prisma 8 skill. Keep v0's existing Postgres skill identifier and coordinate its registered content; a repository update does not prove that v0 refreshed it.
