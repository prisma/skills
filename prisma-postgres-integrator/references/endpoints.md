# endpoints

Management API endpoint details for integrator workflows.

## Create project (with database)

```
POST /v1/projects
```

**Request body:**

```json
{
  "name": "tenant-acme",
  "region": "us-east-1",
  "createDatabase": true
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | No | Auto-generated | Project display name |
| `region` | string | No | `us-east-1` | Region for the database |
| `createDatabase` | boolean | No | `true` | Create a default database with the project |

**Response:**

```json
{
  "data": {
    "id": "proj_clx7abc123",
    "type": "project",
    "name": "tenant-acme",
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
      ]
    }
  }
}
```

## Transfer project

```
POST /v1/projects/{id}/transfer
```

Transfers a project from the authenticated workspace to the workspace of the recipient.

**Request body:**

```json
{
  "recipientAccessToken": "eyJ..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `recipientAccessToken` | string | Yes | OAuth2 access token of the user receiving the project |

**Response:** `204 No Content` on success.

**Prerequisites:**

- The caller must be authenticated with a service token or OAuth token that has access to the project's current workspace
- The `recipientAccessToken` must be a valid OAuth2 access token for a user with a workspace

**Errors:**

- `401` — Invalid service token or recipient access token
- `404` — Project not found or not accessible
- `403` — Insufficient permissions to transfer

## Get database

```
GET /v1/databases/{databaseId}
```

Use to check database status after provisioning or to retrieve database details.

## Create connection

```
POST /v1/databases/{databaseId}/connections
```

Creates a new named connection for a database.

**Request body:**

```json
{
  "name": "tenant-connection"
}
```

## Delete project

```
DELETE /v1/projects/{projectId}
```

Permanently deletes a project and all its databases. Returns `204 No Content`.

## List regions

```
GET /v1/regions/postgres
```

Returns available Prisma Postgres regions. Use to offer region selection to your users.
