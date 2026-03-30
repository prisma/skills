# workflow-reference

Detailed explanation of each step in the preview database GitHub Actions workflow.

## Workflow triggers

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]
```

- `opened` / `reopened`: Provision a new preview database
- `synchronize`: Re-run migrations on the existing preview database (new commits pushed)
- `closed`: Clean up the preview database

## Provision job

### Create preview database

Creates a new project with an embedded database via `POST /v1/projects`. The project name uses the PR number (`preview-pr-{number}`) for deterministic lookup during cleanup.

The `createDatabase: true` flag creates a default database along with the project, returning connection strings in the response.

### Wait for database ready

Polls `GET /v1/databases/{id}` until `status` is `ready`. The database typically becomes ready within 5–15 seconds. The workflow retries up to 12 times with 5-second intervals (60 seconds total).

### Run migrations

Applies the project's Prisma migrations to the preview database:

```bash
npx prisma migrate deploy
```

Uses `migrate deploy` (not `migrate dev`) because CI environments should apply existing migrations without creating new ones. The `DATABASE_URL` and `DIRECT_URL` environment variables are set from the API response.

### Seed database

Runs the seed script defined in `package.json`:

```bash
npx prisma db seed
```

Marked as `continue-on-error: true` because seeding is optional — not all projects have a seed script, and seed failures should not block the workflow.

### Comment on PR

Posts a comment with the preview database details (project ID, database ID, region). This runs only on `opened` and `reopened` events to avoid duplicate comments on `synchronize`.

Connection strings are deliberately excluded from the comment to avoid exposing credentials.

## Cleanup job

### Find and delete preview project

Runs when the PR is closed (merged or abandoned). Lists all workspace projects via `GET /v1/projects`, filters for the one matching `preview-pr-{number}`, and deletes it via `DELETE /v1/projects/{id}`.

Deleting the project cascades to all its databases and connections.

If no matching project is found (e.g., the provision job failed or was never run), the cleanup exits gracefully without error.

## Customization points

### Different migration strategy

Replace `npx prisma migrate deploy` with `npx prisma db push` if the project does not use migrations:

```yaml
- name: Apply schema
  run: npx prisma db push
```

### Additional environment variables

Add project-specific variables to the workflow's `env` block or to individual step `env` blocks:

```yaml
env:
  DATABASE_URL: ${{ steps.create-db.outputs.database_url }}
  DIRECT_URL: ${{ steps.create-db.outputs.direct_url }}
  MY_CUSTOM_VAR: "value"
```

### Path filters

To only run the workflow when Prisma-related files change:

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]
    paths:
      - 'prisma/**'
      - 'src/**'
```

Note: The `closed` event still needs to fire unconditionally for cleanup. Use a job-level condition instead of path filters for the cleanup job.
