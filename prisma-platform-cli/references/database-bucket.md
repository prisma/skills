# Platform databases and buckets

## Priority

CRITICAL

Always start by resolving workspace/project context and reading current help:

```bash
npx -y @prisma/cli@latest database --help
npx -y @prisma/cli@latest bucket --help
```

## Databases

Current groups include:

```bash
npx -y @prisma/cli@latest database list --json
npx -y @prisma/cli@latest database show <database-id> --json
npx -y @prisma/cli@latest database create --help
npx -y @prisma/cli@latest database usage <database-id> --json
npx -y @prisma/cli@latest database backup list <database-id> --json
npx -y @prisma/cli@latest database restore --help
npx -y @prisma/cli@latest database connection --help
```

Database creation can be scoped by project, region, branch, and source. Sources may be empty, another database, or a backup. Do not guess option names: inspect `database create --help` for the installed beta.

Connection operations include list, create, rotate, and remove. A newly created or rotated connection URL is secret one-time output. Capture it without logging and update dependent secrets atomically before removing the prior connection.

Backups are incremental. Treat restore as a mutation: inspect the source backup and destination scope, explain impact, and get any required user approval before running it.

Before deletion, list/show the exact database id, confirm it belongs to the intended project, and pass the exact `--confirm <id>` value required by current help.

### Plan-limit recovery

At Prisma CLI source head `363d3d2`, a database API failure whose structured discriminator is exactly `error.code === "planLimitReached"` becomes the stable CLI error `PLAN_LIMIT_REACHED`. This source behavior landed after published `@prisma/cli@3.0.0-beta.29`, so branch on it only when the installed CLI actually returns that code.

In `--json` mode, inspect `error.code` and `error.meta` rather than human prose. The metadata includes `workspaceId`, `blockedFeature`, `planName`, `usageBlocked`, and `upgradeUrl`; unavailable values are `null`. Treat it as a workspace plan restriction, not a Prisma outage. Use the canonical `upgradeUrl` when present, otherwise direct the user to Prisma Console. Do not infer this diagnosis from an HTTP status, message substring, retry count, or `usageBlocked` alone.

## Buckets and keys

```bash
npx -y @prisma/cli@latest bucket list --json
npx -y @prisma/cli@latest bucket create --name <name>
npx -y @prisma/cli@latest bucket key list <bucket-id> --json
npx -y @prisma/cli@latest bucket key create <bucket-id> --role read_write --name <name>
```

Key roles are `read` and `read_write`. A created key's secret is shown once; never paste it into source or terminal output that will be retained.

Bucket deletion requires `--confirm` with the exact bucket id in the current beta. Key deletion takes both the bucket id and key id but currently has no separate `--confirm` flag; still resolve both ids from `bucket key list` and obtain the user's destructive intent before running it. Recheck installed `--help` because this safety surface is evolving.
