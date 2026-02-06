# create-db-cli

Use `create-db` for instant Prisma Postgres provisioning from the terminal.

## Priority

CRITICAL

## Why It Matters

`create-db` is the fastest way to get a working Prisma Postgres instance for development, demos, and CI previews. It can also emit machine-readable output and write env variables directly.

## Commands

```bash
npx create-db@latest
npx create-db@latest create [options]
npx create-db@latest regions
```

Aliases:

```bash
npx create-pg@latest
npx create-postgres@latest
```

## `create` options

| Flag | Shorthand | Description |
|---|---|---|
| `--region [string]` | `-r` | Region choice: `ap-southeast-1`, `ap-northeast-1`, `eu-central-1`, `eu-west-3`, `us-east-1`, `us-west-1` |
| `--interactive [boolean]` | `-i` | Open region selector |
| `--json [boolean]` | `-j` | Output machine-readable JSON |
| `--env [string]` | `-e` | Write `DATABASE_URL` and `CLAIM_URL` into a target `.env` |
| `--user-agent [string]` | `-u` | Custom user-agent for attribution/testing |

## Lifecycle and claim flow

- Databases are temporary by default.
- Unclaimed databases are auto-deleted after ~24 hours.
- Claim the database using the URL shown in command output to keep it permanently.

## Common patterns

```bash
# quick database
npx create-db@latest

# region-specific database
npx create-db@latest --region eu-central-1

# interactive region selection
npx create-db@latest --interactive

# write env vars for app bootstrap
npx create-db@latest --env .env

# CI-friendly output
npx create-db@latest --json
```

## References

- [npx create-db docs](https://www.prisma.io/docs/postgres/introduction/npx-create-db)
