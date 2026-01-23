# PostgreSQL Setup

Configure Prisma with PostgreSQL.

## Prerequisites

- PostgreSQL database (local or cloud)
- Connection string

## 1. Schema Configuration

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
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
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

- **USER**: Database user
- **PASSWORD**: Password (URL encoded if special chars)
- **HOST**: Hostname (localhost, IP, or domain)
- **PORT**: Port (default 5432)
- **DATABASE**: Database name
- **SCHEMA**: Schema name (default `public`)

## Connection Pooling (Supabase, Neon, etc.)

For serverless environments, use a pooled connection string if available (e.g., PgBouncer), or use a driver adapter.

### Using Driver Adapter (Recommended for Serverless)

1. Install adapter:
   ```bash
   npm install @prisma/adapter-pg pg
   ```

2. Update `prisma.config.ts` (Config remains same, adapter used in Client)

3. Instantiate Client with Adapter:
   ```typescript
   import { PrismaClient } from '../generated/client'
   import { PrismaPg } from '@prisma/adapter-pg'
   import { Pool } from 'pg'

   const connectionString = process.env.DATABASE_URL
   const pool = new Pool({ connectionString })
   const adapter = new PrismaPg(pool)
   const prisma = new PrismaClient({ adapter })
   ```

## Common Issues

### "Can't reach database server"
- Check host and port
- Check firewall settings
- Ensure database is running

### "Authentication failed"
- Check user/password
- Special characters in password must be URL-encoded

### "Schema does not exist"
- Ensure `?schema=public` (or your schema) is in the URL
