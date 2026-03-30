---
name: prisma-postgres-cicd
description: Set up automated preview database provisioning in CI/CD pipelines using the Prisma Management API. Use when asked to "set up preview databases", "automate database provisioning in CI", "create a database per PR", or "add Prisma Postgres to GitHub Actions".
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma Postgres CI/CD

Procedural skill that guides you through setting up automated preview database provisioning in CI/CD pipelines. Each pull request gets its own isolated Prisma Postgres database, with automatic cleanup on merge or close.

## When to Apply

Use this skill when:

- Setting up preview databases that are provisioned per pull request
- Automating Prisma Postgres database provisioning in GitHub Actions
- Creating isolated test databases in CI/CD pipelines
- Adding database lifecycle management to an existing CI workflow

Do **not** use this skill when:

- Setting up a database for local development — use `prisma-postgres-setup`
- Building multi-tenant provisioning into an application — use `prisma-postgres-integrator`
- The project does not yet have a Prisma schema or migrations — run `prisma-postgres-setup` first

## Prerequisites

- An existing Prisma project with `schema.prisma` and at least one migration
- A Prisma Postgres workspace with a service token
- A GitHub repository (or adapt for other CI systems — see Step 5)

## Workflow

### Step 1: Store the service token as a CI secret

The service token authenticates Management API calls in CI. Never hardcode it.

**GitHub Actions:**

1. Go to the repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `PRISMA_SERVICE_TOKEN`, Value: paste the service token

Read `references/auth.md` for how to create a service token.

### Step 2: Generate the GitHub Actions workflow

Create the workflow file at `.github/workflows/preview-db.yml`.

Use the template from `templates/preview-db-workflow.yml` as the starting point. The template handles:

- **PR opened/reopened/synchronized**: Provision a new database, run migrations, seed data, post a PR comment with connection details
- **PR closed**: Delete the preview database to avoid orphaned resources

Copy the template and adapt:

1. Update the Prisma CLI version if the project pins a specific version
2. Update the migration command if the project uses `prisma db push` instead of `prisma migrate deploy`
3. Add any project-specific environment variables the migration or seed steps need

### Step 3: Create or verify the seed script

If the project does not have a seed script, create one. The seed script populates the preview database with test data.

In `package.json`, add:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Insert seed data for preview environment testing
  // Example:
  // await prisma.user.create({
  //   data: { email: 'test@example.com', name: 'Test User' },
  // })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

Adapt the seed data to the project's schema.

### Step 4: Configure environment variables

The workflow template uses these environment variables. Verify they match the project:

| Variable | Source | Description |
|---|---|---|
| `PRISMA_SERVICE_TOKEN` | GitHub Secret | Management API authentication |
| `DATABASE_URL` | Set by workflow | Pooled connection string (generated per PR) |
| `DIRECT_URL` | Set by workflow | Direct connection string (generated per PR) |

If the project needs additional environment variables for migrations or seeding, add them to the workflow's `env` block.

### Step 5: Adapting to other CI systems

The workflow template targets GitHub Actions. For other CI systems, adapt the same Management API calls:

**GitLab CI:**

- Use `CI_MERGE_REQUEST_IID` instead of `${{ github.event.number }}` for the database name
- Store `PRISMA_SERVICE_TOKEN` as a CI/CD variable (Settings → CI/CD → Variables)
- Use `rules: - if: $CI_PIPELINE_SOURCE == "merge_request_event"` to trigger on merge requests

**CircleCI:**

- Use `CIRCLE_PULL_REQUEST` to derive the PR number for the database name
- Store `PRISMA_SERVICE_TOKEN` as a project environment variable
- Use workflow filters to trigger on pull request events

The core API calls (`POST /v1/projects`, `DELETE /v1/projects/{id}`) are the same across all CI systems. Read `references/endpoints.md` for endpoint details.

## Error Handling

Read `references/api-basics.md` for the full error reference. CI-specific patterns:

| Scenario | Action |
|---|---|
| 401 on API call | The `PRISMA_SERVICE_TOKEN` secret is missing, expired, or incorrect. Regenerate it in Console → Workspace Settings → Service Tokens and update the CI secret. |
| Database stuck in `provisioning` | Poll `GET /v1/databases/{id}` with retries. If still not ready after 60 seconds, fail the job and alert. |
| PR comment fails | Non-critical. Log the error but do not fail the workflow. |
| Cleanup job fails (database not deleted) | Log a warning. Orphaned databases can be cleaned up manually or via a scheduled job. |

## Reference Files

```
references/api-basics.md        — Base URL, envelope, IDs, errors, pagination
references/auth.md              — Service token creation and usage
references/endpoints.md         — Endpoint details for project/database lifecycle
references/workflow-reference.md — Detailed explanation of each workflow step
templates/preview-db-workflow.yml — Complete GitHub Actions workflow template
```
