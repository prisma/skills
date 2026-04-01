# workflow-reference

Detailed explanation of each step in the preview database GitHub Actions workflow.

## Workflow triggers

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize, closed]
```

- `opened` / `reopened`: Provision a new preview database within the CI project
- `synchronize`: Re-apply schema on the existing preview database (new commits pushed)
- `closed`: Clean up the preview database

## Architecture

Preview databases are created **within a single project** (identified by `PRISMA_PROJECT_ID`), not as separate projects per PR. This avoids hitting project limits and keeps ephemeral databases organized under one umbrella.

The database is named deterministically (`pr_{number}_{branch}`) so the workflow can check for an existing database before creating a new one (idempotency).

## Provision job

### Check for existing database

Lists databases in the CI project via `GET /v1/projects/{projectId}/databases` and filters by the deterministic name. If found, the workflow reuses the existing database instead of creating a new one. This handles the `synchronize` case (new commits pushed) without creating duplicate databases.

### Create preview database

If no existing database is found, creates one via `POST /v1/projects/{projectId}/databases`. The response includes connection strings for the new database.

### Wait for database ready

Polls `GET /v1/databases/{id}` until `status` is `ready`. The database typically becomes ready within 5–15 seconds. The workflow retries up to 12 times with 5-second intervals (60 seconds total).

### Apply schema

The workflow auto-detects the project's schema strategy:

- **If `prisma/migrations/` exists**: Runs `npx prisma migrate deploy` to apply existing migration files.
- **If no migrations directory**: Runs `npx prisma db push` to sync the schema directly.

This makes the workflow compatible with both migration-based and prototyping workflows without manual configuration.

### Seed database

Runs the seed script defined in `prisma.config.ts`:

```bash
npx prisma db seed
```

Marked as `continue-on-error: true` because seeding is optional — not all projects have a seed script, and seed failures should not block the workflow.

### Comment on PR

Posts a comment with the preview database details (database ID, name). This runs only on `opened` and `reopened` events to avoid duplicate comments on `synchronize`.

Connection strings are deliberately excluded from the comment to avoid exposing credentials.

## Cleanup job

### Find and delete preview database

Runs when the PR is closed (merged or abandoned). Lists databases in the CI project via `GET /v1/projects/{projectId}/databases`, filters for the one matching `pr_{number}_{branch}`, and deletes it via `DELETE /v1/databases/{id}`.

Only the database is deleted — the project remains for future PRs.

If no matching database is found (e.g., the provision job failed or was never run), the cleanup exits gracefully without error.

## Customization points

### Additional environment variables

Add project-specific variables to the workflow's `env` block or to individual step `env` blocks:

```yaml
env:
  DATABASE_URL: ${{ steps.resolve.outputs.database_url }}
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
