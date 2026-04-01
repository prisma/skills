---
name: prisma-postgres-cicd
description: Set up automated preview database provisioning in CI/CD pipelines using the Prisma Management API. Use when asked to "set up preview databases", "automate database provisioning in CI", "create a database per PR", or "add Prisma Postgres to GitHub Actions".
license: MIT
metadata:
  author: prisma
  version: "2.0.0"
---

# Prisma Postgres CI/CD

Procedural skill that guides you through setting up automated preview database provisioning in CI/CD pipelines. Each pull request gets its own isolated Prisma Postgres database within a dedicated CI project, with automatic cleanup on merge or close.

## When to Apply

Use this skill when:

- Setting up preview databases that are provisioned per pull request
- Automating Prisma Postgres database provisioning in GitHub Actions
- Creating isolated test databases in CI/CD pipelines
- Adding database lifecycle management to an existing CI workflow

Do **not** use this skill when:

- Setting up a database for local development — use `prisma-postgres-setup`
- Building multi-tenant provisioning into an application — use `prisma-postgres-integrator`
- The project does not yet have a Prisma schema — run `prisma-postgres-setup` first

## Prerequisites

- An existing Prisma project with `schema.prisma`
- A Prisma Postgres workspace with a service token
- A GitHub repository (or adapt for other CI systems — see Step 6)

## Workflow

### Step 1: Determine or create the CI project

Preview databases are created as ephemeral databases within a single project — **not** as separate projects per PR. This avoids hitting project limits and keeps preview databases organized.

Check if the user already has a project they want to use for CI preview databases:

- If the user's workspace already has a project for this repo, offer to reuse it.
- If not, create a dedicated CI project via the Management API:

```bash
curl -s -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "<repo-name>-ci", "region": "<region>", "createDatabase": false}'
```

The `"createDatabase": false` flag is important — without it, the project ships with an empty database that counts toward the workspace limit. The workflow creates databases on demand per PR.

**Set the region** to match the project's existing database region. Check `prisma.config.ts` comments, the Prisma Console, or query `GET /v1/projects` with the service token. If unsure, ask the user.

Extract `data.id` from the response — this is the `PRISMA_PROJECT_ID` needed for the workflow.

Read `references/endpoints.md` for the full request/response shapes.

### Step 2: Store secrets in CI

The workflow needs two secrets. Never hardcode them.

**GitHub Actions:**

1. Go to the repository → **Settings** → **Secrets and variables** → **Actions**
2. Add **two** repository secrets:
   - `PRISMA_SERVICE_TOKEN` — the workspace service token
   - `PRISMA_PROJECT_ID` — the project ID from Step 1 (e.g., `proj_abc123`)

Read `references/auth.md` for how to create a service token.

### Step 3: Generate the GitHub Actions workflow

Create the workflow file at `.github/workflows/preview-db.yml`.

Use the template from `templates/preview-db-workflow.yml` as the starting point. The template handles:

- **PR opened/reopened/synchronized**: Check if a preview database already exists for this PR, create one if not, apply schema, seed data, post a PR comment
- **PR closed**: Find and delete the preview database

Copy the template and adapt:

1. **Schema sync strategy**: The template detects whether the project uses migrations (`prisma/migrations/` exists) or `db push`. If the project uses migrations, it runs `prisma migrate deploy`. If not, it runs `prisma db push`. Review the template and confirm the detection logic matches the project.
2. Add any project-specific environment variables the schema sync or seed steps need.

### Step 4: Create or verify the seed script

If the project does not have a seed script, create one. The seed script populates the preview database with test data.

In `prisma.config.ts`, add a seed command in the `migrations` block if not already present:

```typescript
export default defineConfig({
  // ...existing config...
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
})
```

Create `prisma/seed.ts` using the Prisma 7 client instantiation pattern:

```typescript
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Adapt to the project's schema. Example:
  // await prisma.user.create({
  //   data: { email: 'test@example.com', name: 'Test User' },
  // })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
```

Adapt the seed data to the project's schema. If the project already has a working seed script, skip this step.

### Step 5: Configure environment variables

The workflow template uses these environment variables. Verify they match the project:

| Variable | Source | Description |
|---|---|---|
| `PRISMA_SERVICE_TOKEN` | GitHub Secret | Management API authentication |
| `PRISMA_PROJECT_ID` | GitHub Secret | Project to create preview databases in |
| `DATABASE_URL` | Set by workflow | Direct connection string (generated per PR) |

If the project needs additional environment variables for schema sync or seeding, add them to the workflow's `env` block.

### Step 6: Adapting to other CI systems

The workflow template targets GitHub Actions. For other CI systems, adapt the same Management API calls:

**GitLab CI:**

- Use `CI_MERGE_REQUEST_IID` instead of `${{ github.event.number }}` for the database name
- Store `PRISMA_SERVICE_TOKEN` and `PRISMA_PROJECT_ID` as CI/CD variables (Settings → CI/CD → Variables)
- Use `rules: - if: $CI_PIPELINE_SOURCE == "merge_request_event"` to trigger on merge requests

**CircleCI:**

- Use `CIRCLE_PULL_REQUEST` to derive the PR number for the database name
- Store secrets as project environment variables
- Use workflow filters to trigger on pull request events

The core API calls (`POST /v1/projects/{id}/databases`, `DELETE /v1/databases/{id}`) are the same across all CI systems. Read `references/endpoints.md` for endpoint details.

### Step 7: Verify the project is on GitHub

After generating the workflow, check if the project has a git remote pointing to GitHub:

- If a remote exists and is up to date, the setup is complete.
- If a remote exists but the workflow file hasn't been pushed, offer to commit and push.
- If **no remote exists** (common for freshly scaffolded projects), offer to help the user create a GitHub repo and push. Use standard git best practices and any project-level conventions (e.g., `AGENTS.md`, `.github/` config). Do not force this — ask the user if they'd like help.

The workflow won't run until it's on GitHub, so this is the natural final step.

## Error Handling

Read `references/api-basics.md` for the full error reference. CI-specific patterns:

| Scenario | Action |
|---|---|
| 401 on API call | The `PRISMA_SERVICE_TOKEN` secret is missing, expired, or incorrect. Regenerate it in Console → Workspace Settings → Service Tokens and update the CI secret. |
| Database stuck in `provisioning` | Poll `GET /v1/databases/{id}` with retries. If still not ready after 60 seconds, fail the job and alert. |
| PR comment fails | Non-critical. Log the error but do not fail the workflow. |
| Cleanup job fails (database not deleted) | Log a warning. Orphaned databases can be cleaned up manually or via a scheduled job. |
| Database limit reached | The project has hit its database limit. Delete unused preview databases or upgrade the plan. |

## Reference Files

```
references/api-basics.md        — Base URL, envelope, IDs, errors, pagination
references/auth.md              — Service token creation and usage
references/endpoints.md         — Endpoint details for project/database lifecycle
references/workflow-reference.md — Detailed explanation of each workflow step
templates/preview-db-workflow.yml — Complete GitHub Actions workflow template
```
