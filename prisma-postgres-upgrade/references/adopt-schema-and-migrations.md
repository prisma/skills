# adopt-schema-and-migrations

Keep the Prisma ORM 6 or 7 `schema.prisma` as the contract, and hand migrations to Prisma 8 once.

## Priority

CRITICAL

## Why It Matters

Porting the schema by hand risks a contract that no longer matches the tables, which makes
`db sign` fail or plans a destructive migration. And the Compute deploy builds each database
from `migrations/app/`, so without a baseline there, previews and production start with no
tables.

## What is specific to coming from 6 or 7

- **`prisma7Schema(...)` also reads a Prisma ORM 6 schema unchanged**, including the
  `generator client` block and `url = env(...)`. Do not edit `schema.prisma` or port it to a
  `contract.prisma`. Wire it in the Prisma 8 `prisma.config.ts` with `output: "src/prisma"`, so
  `contract.json` and `contract.d.ts` land where `tsc` and the Compute service find them. In a
  Prisma ORM 7 app, replace the old `prisma.config.ts`: Prisma 8 reads only its own format
  under that name.
- **A CommonJS app built with `tsc` stays CommonJS.** Set `"module"` and `"moduleResolution"`
  to `"nodenext"`, add `"resolveJsonModule": true`, keep `include` at `src`, and do not add
  `"type": "module"`.
- **Sign the existing database, then plan the baseline:** `contract emit`, `db sign`,
  `migration plan --name init`. Sign every other existing database (staging) too; databases the
  Compute deploy creates do not need it.
- **Retire the old migration setup:** delete `prisma/migrations` (with `migration_lock.toml`),
  remove `prisma generate`, `prisma migrate *` and `prisma db seed` from scripts, and remove the
  `"prisma": { "seed": ... }` key. Prisma 8 has no `generate` or seed command. The
  `_prisma_migrations` table stays in the database; dropping it is the user's call.

For the config shape, `contract emit`, `db sign`, the migration commands and every later
schema change, follow the synced `prisma-8` skill (`references/contract.md`,
`references/migration-model.md`, `references/migrations.md`). It matches the installed version.

## Bad

```bash
# Rewriting schema.prisma into contract.prisma, or keeping prisma/migrations "for now"
npx prisma7 migrate dev
```

## Good

```typescript
contract: prisma7Schema("prisma/schema.prisma"), // the same file, Prisma ORM 6 or 7
```

```bash
npx prisma contract emit && npx prisma db sign && npx prisma migration plan --name init
rm -r prisma/migrations
```

## References

- [Guide, steps 2 and 3](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#2-create-the-contract-from-your-schema)
- The synced `prisma-8` skill, authoritative for the installed version
