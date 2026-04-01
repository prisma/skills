# endpoints

Management API endpoint details for CI/CD preview database workflows.

## Create project (for CI)

```
POST /v1/projects
```

Use this once during setup to create a dedicated CI project that will hold all preview databases.

**Request body:**

```json
{
  "name": "my-app-ci",
  "region": "us-east-1"
}
```

**Response:**

```json
{
  "data": {
    "id": "proj_clx7abc123",
    "type": "project",
    "name": "my-app-ci",
    "createdAt": "2025-06-15T10:30:00.000Z"
  }
}
```

Store `data.id` as `PRISMA_PROJECT_ID` in your CI secrets.

## List databases in a project

```
GET /v1/projects/{projectId}/databases
```

Use to check if a preview database already exists before creating a new one.

**Response:**

```json
{
  "data": [
    {
      "id": "db_abc123",
      "type": "database",
      "name": "pr_42_feature_branch",
      "status": "ready"
    }
  ],
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

Filter by name client-side to find the preview database matching the PR.

## Create database in a project

```
POST /v1/projects/{projectId}/databases
```

Creates an ephemeral preview database within the CI project.

**Request body:**

```json
{
  "name": "pr_42_feature_branch",
  "region": "us-east-1"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | No | Auto-generated | Database name. Use a deterministic name (e.g., `pr_{number}_{branch}`) for idempotent lookup and cleanup. |
| `region` | string | No | `us-east-1` | Region for the database |

**Response:**

```json
{
  "data": {
    "id": "db_def456",
    "type": "database",
    "status": "ready",
    "name": "pr_42_feature_branch",
    "connections": [
      {
        "id": "con_ghi789",
        "kind": "postgres",
        "endpoints": {
          "direct": {
            "host": "db.prisma.io",
            "port": 5432,
            "connectionString": "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"
          }
        }
      }
    ],
    "region": { "id": "us-east-1", "name": "US East (N. Virginia)" }
  }
}
```

Key fields:

- `data.id` — database ID (needed to poll status and for cleanup)
- `data.connections[0].endpoints.direct.connectionString` → `DATABASE_URL`

## Create connection (for existing database)

```
POST /v1/databases/{databaseId}/connections
```

Use when the preview database already exists (on `synchronize` events) and you need a fresh connection string.

**Request body:**

```json
{
  "name": "ci-run-123"
}
```

**Response:**

```json
{
  "data": {
    "id": "con_new123",
    "endpoints": {
      "direct": {
        "connectionString": "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"
      }
    }
  }
}
```

## Get database (poll for status)

```
GET /v1/databases/{databaseId}
```

Use to poll until `data.status` is `ready`. If status is `provisioning`, wait and retry.

## Delete database

```
DELETE /v1/databases/{databaseId}
```

Permanently deletes a single database. Returns `204 No Content`. Use in the cleanup job when a PR is closed — deletes only the preview database, not the project.

## List regions

```
GET /v1/regions/postgres
```

Returns available regions. Use to validate or select the region for the CI project.
