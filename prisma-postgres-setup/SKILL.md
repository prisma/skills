---
name: prisma-postgres-setup
description: Set up a new Prisma Postgres database and connect it to a local project using the Management API. Use when asked to "set up a database", "create a Prisma Postgres project", "get a connection string", "connect my app to Prisma Postgres", or "provision a database".
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma Postgres Setup

Procedural skill that guides you through provisioning a new Prisma Postgres database via the Management API and connecting it to a local project.

## When to Apply

Use this skill when:

- Setting up a new Prisma Postgres database for a project
- Creating a Prisma Postgres project and connecting it locally
- Obtaining a connection string for Prisma Postgres
- Provisioning a database via the Management API (not the Console UI)

Do **not** use this skill when:

- Setting up CI/CD preview databases — use `prisma-postgres-cicd`
- Building multi-tenant database provisioning into an app — use `prisma-postgres-integrator`
- Working with a database that already exists and is connected (schema/migration tasks are standard Prisma CLI)

## Prerequisites

- Node.js 18+
- A Prisma Postgres workspace (create one at https://console.prisma.io if needed)
- A workspace service token (see `references/auth.md`)

## Workflow

Follow these steps in order. Each step includes the API call to make and how to handle the response.

### Step 1: Check for a service token

Look for `PRISMA_SERVICE_TOKEN` in the project's environment or `.env` file.

If no token is available, instruct the user:

> Create a service token in Prisma Console → Workspace Settings → Service Tokens.
> Copy the token and set it as `PRISMA_SERVICE_TOKEN` in your environment.

Read `references/auth.md` for details on token creation and usage.

### Step 2: List available regions

Fetch the list of available Prisma Postgres regions to let the user choose where to deploy.

```bash
curl -s -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  https://api.prisma.io/v1/regions/postgres
```

The response contains an array of regions with `id`, `name`, and `status`. Only use regions where `status` is `available`. Common choices:

- `us-east-1` — US East (N. Virginia)
- `eu-west-1` — EU West (Ireland)
- `ap-northeast-1` — Asia Pacific (Tokyo)

Read `references/endpoints.md` for the full response shape.

### Step 3: Create a project with a database

```bash
curl -s -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<project-name>",
    "region": "<region-id>",
    "createDatabase": true
  }'
```

The response is wrapped in `{ "data": { ... } }`. Extract:

- `data.id` — the project ID (prefixed with `proj_`)
- `data.database.id` — the database ID (prefixed with `db_`)
- `data.database.connections[0].endpoints.direct.connectionString` — the direct connection string
- `data.database.connections[0].endpoints.pooled.connectionString` — the pooled connection string (recommended for serverless)

If the response status is `provisioning`, wait a few seconds and poll `GET /v1/databases/<database-id>` until `status` is `ready`.

Read `references/endpoints.md` for the full request/response shapes.

### Step 4: Create a named connection (optional)

If you need a dedicated connection (e.g., per-developer or per-environment), create one:

```bash
curl -s -X POST https://api.prisma.io/v1/databases/<database-id>/connections \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "dev" }'
```

Extract connection strings from the response:

- `data.endpoints.direct.connectionString` — for direct connections
- `data.endpoints.pooled.connectionString` — for pooled/serverless connections

### Step 5: Configure the local project

1. Write the connection string to `.env`:

```
DATABASE_URL="<pooled-connection-string>"
DIRECT_URL="<direct-connection-string>"
```

If `.env` already exists, upsert the `DATABASE_URL` and `DIRECT_URL` entries. Do not duplicate them.

2. Verify `.gitignore` includes `.env`. Warn the user if it does not.

3. If `prisma/schema.prisma` does not exist, run `npx prisma init --datasource-provider prismaPostgres` first.

4. Ensure `schema.prisma` has the correct datasource configuration:

```prisma
datasource db {
  provider  = "prismaPostgres"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Step 6: Push schema and generate client

If the schema has models defined:

```bash
npx prisma db push
```

Or for a production-ready migration workflow:

```bash
npx prisma migrate dev --name init
```

Then generate the Prisma Client:

```bash
npx prisma generate
```

If the schema has no models yet, tell the user:

> Add models to `prisma/schema.prisma`, then run `npx prisma db push` to apply them.

## Error Handling

Read `references/api-basics.md` for the full error reference. Key self-correction patterns:

| HTTP Status | Error Code | Action |
|---|---|---|
| 401 | `authentication-failed` | Service token is invalid or expired. Create a new one in Console → Workspace Settings → Service Tokens. |
| 404 | `resource-not-found` | Check that the resource ID includes the correct prefix (`proj_`, `db_`, `con_`). |
| 422 | `validation-error` | Check request body against the endpoint schema. Common: missing `name`, invalid `region`. |
| 429 | `rate-limit-exceeded` | Back off and retry after a few seconds. |

## Reference Files

Detailed API information is in:

```
references/api-basics.md    — Base URL, envelope, IDs, errors, pagination
references/auth.md          — Service token creation and usage
references/endpoints.md     — Endpoint details for projects, databases, connections, regions
```
