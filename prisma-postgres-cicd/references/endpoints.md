# endpoints

Management API endpoint details for CI/CD preview database workflows.

## Create project (with database)

```
POST /v1/projects
```

**Request body:**

```json
{
  "name": "preview-pr-42",
  "region": "us-east-1",
  "createDatabase": true
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | No | Auto-generated | Project display name. Use a deterministic name (e.g., `preview-pr-{number}`) so the cleanup job can find it. |
| `region` | string | No | `us-east-1` | Region for the database |
| `createDatabase` | boolean | No | `true` | Create a default database with the project |

**Response:**

```json
{
  "data": {
    "id": "proj_clx7abc123",
    "type": "project",
    "name": "preview-pr-42",
    "database": {
      "id": "db_def456",
      "status": "ready",
      "connections": [
        {
          "id": "con_ghi789",
          "kind": "postgres",
          "endpoints": {
            "direct": {
              "host": "db.prisma.io",
              "port": 5432,
              "connectionString": "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"
            },
            "pooled": {
              "host": "pooled.db.prisma.io",
              "port": 5432,
              "connectionString": "postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require"
            }
          }
        }
      ],
      "region": { "id": "us-east-1", "name": "US East (N. Virginia)" }
    }
  }
}
```

Key fields:

- `data.id` — project ID (needed for cleanup via `DELETE /v1/projects/{id}`)
- `data.database.id` — database ID (needed to poll status)
- `data.database.connections[0].endpoints.pooled.connectionString` → `DATABASE_URL`
- `data.database.connections[0].endpoints.direct.connectionString` → `DIRECT_URL`

## Get database (poll for status)

```
GET /v1/databases/{databaseId}
```

Use to poll until `data.status` is `ready`. If status is `provisioning`, wait and retry.

## List projects (for cleanup)

```
GET /v1/projects
```

Returns all projects in the workspace. Use to find the preview project by name during cleanup.

**Response:**

```json
{
  "data": [
    { "id": "proj_abc", "type": "project", "name": "preview-pr-42" },
    { "id": "proj_def", "type": "project", "name": "production" }
  ],
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

Filter by name client-side to find the preview project matching the PR number.

## Delete project

```
DELETE /v1/projects/{projectId}
```

Permanently deletes the project and all its databases. Returns `204 No Content`.

Use in the cleanup job when a PR is closed or merged.

## List regions

```
GET /v1/regions/postgres
```

Returns available regions. Use to validate the region before creating a project, or to let the user choose a region.
