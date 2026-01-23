# Driver Adapters

Prisma v7 requires driver adapters for all database connections. This replaces the built-in Rust query engine.

## Why Driver Adapters?

- No more binary downloads
- Smaller bundle size
- Better serverless/edge compatibility
- Uses native Node.js database drivers
- More control over connection pooling

## Available Adapters

| Database | Adapter Package | Underlying Driver |
|----------|-----------------|-------------------|
| PostgreSQL | `@prisma/adapter-pg` | `pg` |
| MySQL | `@prisma/adapter-mysql2` | `mysql2` |
| SQLite | `@prisma/adapter-better-sqlite3` | `better-sqlite3` |
| Neon | `@prisma/adapter-neon` | `@neondatabase/serverless` |
| PlanetScale | `@prisma/adapter-planetscale` | `@planetscale/database` |
| Turso/libSQL | `@prisma/adapter-libsql` | `@libsql/client` |
| D1 (Cloudflare) | `@prisma/adapter-d1` | Cloudflare D1 |

## Installation

### PostgreSQL

```bash
npm install @prisma/adapter-pg
```

### MySQL

```bash
npm install @prisma/adapter-mysql2
```

### SQLite

```bash
npm install @prisma/adapter-better-sqlite3
```

## Configuration

### PostgreSQL

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })
```

### MySQL

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaMySQL } from '@prisma/adapter-mysql2'

const adapter = new PrismaMySQL({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })
```

### SQLite

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
})

const prisma = new PrismaClient({ adapter })
```

### Neon (Serverless PostgreSQL)

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })
```

## Connection Pool Configuration

Driver adapters use the underlying driver's pool settings, which differ from v6 defaults.

### PostgreSQL with custom pool

```typescript
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Pool configuration
  max: 10,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection timeout (v6 default was 5s)
})
```

### Matching v6 behavior

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,  // v6 used 5 second timeout
})
```

## SSL Configuration

### Accept self-signed certificates

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Accept self-signed certs
  }
})
```

### Proper SSL configuration

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync('/path/to/ca-cert.pem'),
    rejectUnauthorized: true
  }
})
```

## Migration from v6

### Before (v6)

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
})
```

### After (v7)

```typescript
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })
```

## Singleton Pattern

```typescript
// lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```
