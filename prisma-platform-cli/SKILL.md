---
name: prisma-platform-cli
description: Prisma Platform CLI reference for the public-beta `@prisma/cli` package. Use for Prisma Platform authentication and workspace switching, projects, databases, connections, backups, buckets and keys, Git integration, branches, agent skill installation, and feedback. Triggers on "@prisma/cli", "prisma-cli", "auth workspace", "project link", "database create", "bucket create", "agent install", or "Prisma Platform CLI". For Compute app deployment use `prisma-compute`; for ORM migrations use `prisma-cli`.
license: MIT
metadata:
  author: prisma
  version: "0.2.0"
---

# Prisma Platform CLI

Reference for the public-beta `@prisma/cli` package, whose installed binary is `prisma-cli`. It is separate from the stable Prisma ORM CLI (`prisma`). Verify installed help and structured errors before relying on a beta behavior.

## Boundaries

| Task | Skill / package |
|------|-----------------|
| Prisma schema, Client, migrations, Studio | `prisma-cli` / `prisma` |
| Platform auth, projects, databases, buckets, Git, agent tools | this skill / `@prisma/cli` |
| Compute apps, builds, deploys, logs, domains | `prisma-compute` / `@prisma/cli` |
| Low-level Prisma Postgres Management API | `prisma-postgres` |

After routing to another skill, use that skill for command details; do not duplicate or guess them here.

The Platform CLI is beta and requires Node.js 22.12 or newer. Verify current help before mutating resources:

```bash
npx -y @prisma/cli@latest --help
npx -y @prisma/cli@latest <group> --help
```

## Command Map

| Group | Current operations |
|-------|--------------------|
| `auth` | login, logout, whoami, workspace list/use/logout |
| `project` | list, show, create, link, rename, remove, transfer, env |
| `database` | list, show, create, usage, restore, remove, backup, connection |
| `bucket` | list, create, delete, key list/create/delete |
| `git` | connect, disconnect |
| `branch` | list only |
| `build` | logs |
| `app` | Compute lifecycle; hand off to `prisma-compute` |
| `agent` | install, update, status |
| `feedback` | send CLI feedback |

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Authentication and scope | CRITICAL | `auth-` |
| 2 | Secret handling | CRITICAL | `secret-` |
| 3 | Destructive confirmation | CRITICAL | `confirm-` |
| 4 | Database and bucket operations | HIGH | `resource-` |
| 5 | Agent tooling and feedback | MEDIUM | `agent-` |

## Global Agent Rules

- Read only the reference needed for the requested command group and keep the answer task-scoped.
- Prefer `--json --no-interactive` for automation and parse ids from JSON rather than display text.
- Use `--yes` only after the intended mutation is clear; it is not permission for destructive or production actions.
- Never print service tokens, connection strings, bucket secret keys, or environment-variable values.
- Connection URLs and bucket secret keys are one-time outputs. Capture them directly into the intended secret store; later list/show calls cannot recover them.
- Resolve the active workspace and project before a mutation. Names may be ambiguous; use ids in scripts.
- Do not invent branch mutation commands: the current Platform CLI exposes `branch list`, not branch create/delete.
- Verify `--confirm` requirements from command help. Resource deletion currently requires the exact target id.

## Authentication and Context

```bash
npx -y @prisma/cli@latest auth whoami --json
npx -y @prisma/cli@latest auth workspace list --json
npx -y @prisma/cli@latest auth workspace use <workspace-id>
npx -y @prisma/cli@latest project link <project-id>
```

A non-empty `PRISMA_SERVICE_TOKEN` takes precedence over cached OAuth workspaces. Unset it before switching local OAuth context. Read [`references/auth-project.md`](references/auth-project.md).

## Database and Bucket Safety

Read [`references/database-bucket.md`](references/database-bucket.md) before provisioning or deleting resources. It covers explicit scope, one-time secrets, backups, bucket roles, and exact-id confirmation.

## Agent Tools and Feedback

```bash
npx -y @prisma/cli@latest agent status
npx -y @prisma/cli@latest agent install --dry-run
npx -y @prisma/cli@latest agent update
npx -y @prisma/cli@latest feedback "<concise problem or feedback>"
```

Read [`references/agent-feedback.md`](references/agent-feedback.md) before changing installed skills or reporting a CLI failure.
