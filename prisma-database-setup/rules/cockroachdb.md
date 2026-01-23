# CockroachDB Setup

Configure Prisma with CockroachDB.

## Prerequisites

- CockroachDB cluster

## 1. Schema Configuration

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "cockroachdb"
}

generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}
```

## 2. Config Configuration (v7)

In `prisma.config.ts`:

```typescript
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

## 3. Environment Variable

In `.env`:

```env
DATABASE_URL="postgresql://user:password@host:26257/db?sslmode=verify-full"
```

Note: CockroachDB uses the PostgreSQL wire protocol, so the URL often looks like postgresql, but the provider **MUST** be `cockroachdb` in the schema to handle specific CRDB features correctly.

## ID Generation

CockroachDB uses `BigInt` or `UUID` for IDs efficiently.

```prisma
model User {
  id BigInt @id @default(autoincrement()) // Uses unique_rowid()
}
```

Or using string UUIDs:

```prisma
model User {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
}
```

## Common Issues

### Schema Introspection
Always use `provider = "cockroachdb"` to ensure correct type mapping during `db pull`.
