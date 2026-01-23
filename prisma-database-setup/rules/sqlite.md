# SQLite Setup

Configure Prisma with SQLite.

## Prerequisites

- None (file-based)

## 1. Schema Configuration

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
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
DATABASE_URL="file:./dev.db"
```

### Connection String Format

```
file:PATH
```

- **PATH**: Relative path to the database file (from `prisma/schema.prisma` location usually, but in v7 check `prisma.config.ts` context). Usually relative to the schema file.

## Using Driver Adapter (LibSQL / Turso)

For edge compatibility or Turso:

1. Install:
   ```bash
   npm install @prisma/adapter-libsql @libsql/client
   ```

2. Instantiate:
   ```typescript
   import { PrismaClient } from '../generated/client'
   import { PrismaLibSQL } from '@prisma/adapter-libsql'
   import { createClient } from '@libsql/client'

   const libsql = createClient({
     url: process.env.TURSO_DATABASE_URL,
     authToken: process.env.TURSO_AUTH_TOKEN
   })

   const adapter = new PrismaLibSQL(libsql)
   const prisma = new PrismaClient({ adapter })
   ```

## Limitations

- **No Enums**: SQLite doesn't support enums (Prisma polyfills them or treats as String).
- **No Scalar Lists**: `String[]` is not supported directly.
- **Concurrency**: Write operations lock the file.

## Common Issues

### "Database file not found"
Ensure the path in `DATABASE_URL` is correct relative to where Prisma is running or the schema file. `file:./dev.db` creates it next to schema.
