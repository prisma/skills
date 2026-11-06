# schema-contract-mapping

Prisma 8 reads the existing Prisma ORM 6 or 7 `schema.prisma` as its contract; do not port it.

## Priority

CRITICAL

## Why It Matters

Porting the schema by hand risks a contract that no longer matches the tables, and a mismatch
makes `db sign` fail or plans a destructive migration. `prisma7Schema(...)` reads the file the
app already has, including a Prisma ORM 6 schema, so the database is never touched.

## prisma.config.ts

Create it in the project root. In a Prisma ORM 7 app, replace the existing one: Prisma 8 reads
only its own config format under that name.

```typescript
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig, prisma7Schema } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: defineConfig({
    contract: prisma7Schema("prisma/schema.prisma"),
    output: "src/prisma",
    db: { connection: process.env["DATABASE_URL"] },
  }),
});
```

- Leave `schema.prisma` alone. The `generator client { ... }` block and `url = env(...)` in the
  datasource stay; Prisma 8 ignores them.
- `output: "src/prisma"` puts `contract.json` and `contract.d.ts` inside `src/`, where `tsc`
  compiles them and the Compute service imports them.
- `view` blocks and some extensions need extra config; see
  [Use a Prisma ORM 7 schema](https://www.prisma.io/docs/cli/configuration#use-a-prisma-orm-7-schema).

## Emit and sign

```bash
npx prisma contract emit   # Emitted contract.json and contract.d.ts
npx prisma db sign         # Database signed, Advanced ref "db"
```

Commit both emitted files, and run `contract emit` after every edit to `schema.prisma`. `db sign`
checks the tables match, writes a marker, and writes `migrations/app/refs/db.json`; it does not
change tables. Run it once against every other existing database (staging) too. A database the
Compute deploy creates does not need it.

## tsconfig.json for a tsc + node app

Prisma 8 packages are ES modules, and the code imports `contract.json`. A CommonJS app compiled
with `tsc` stays CommonJS:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

Do not add `"type": "module"`, and keep `include` at `src` so `prisma.config.ts` is not compiled into
`dist/`. For `tsx`, bundlers or ESM apps, see the guide's link to the tsconfig cases.

## Bad

```prisma
// Rewriting schema.prisma into a new contract.prisma before the app even runs on Prisma 8
```

## Good

```typescript
contract: prisma7Schema("prisma/schema.prisma"), // same file, Prisma ORM 6 or 7
```

## References

- [Guide, step 2](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#2-create-the-contract-from-your-schema)
- [Guide, step 4](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#4-point-typescript-at-the-prisma-8-client)
- The synced `prisma-8` skill, for the contract itself
