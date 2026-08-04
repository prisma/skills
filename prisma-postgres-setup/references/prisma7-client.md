# Prisma 7 Client Instantiation

Prisma 7 changed how PrismaClient connects to databases. The CLI (`prisma db push`, `prisma migrate`) reads the URL from `prisma.config.ts`. But at **runtime**, you must provide a driver adapter to PrismaClient explicitly.

## Required packages

```bash
npm install @prisma/client @prisma/adapter-pg pg
```

- `@prisma/adapter-pg` — the Prisma adapter for the `pg` PostgreSQL driver
- `pg` — the underlying Node.js PostgreSQL driver

## Basic instantiation

```typescript
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })
```

## Key rules

1. **Import path**: Import the `client` entrypoint under the generator's configured `output` directory. `./generated/prisma/client.js` is correct only when the schema uses `output = "../generated/prisma"` and the app's module settings require `.js` specifiers.

2. **Adapter is mandatory**: `new PrismaClient()` with no arguments throws. `new PrismaClient({ datasourceUrl: '...' })` also throws — `datasourceUrl` does not exist in Prisma 7.

3. **Module format**: ESM is the default. Existing CommonJS projects can set `moduleFormat = "cjs"` in the `prisma-client` generator; do not force the whole app to ESM.

4. **Pool lifecycle**: When `PrismaPg` receives a connection string/config, the adapter owns its pool and `prisma.$disconnect()` disposes it. When you pass an existing `pg.Pool`, your app owns that pool and must call `pool.end()` after Prisma disconnects.

## Usage in application code

```typescript
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

// Create
const user = await prisma.user.create({
  data: { email: 'alice@example.com', name: 'Alice' },
})

// Read with relations
const posts = await prisma.post.findMany({
  where: { published: true },
  include: { author: true },
})

// Update
await prisma.post.update({
  where: { id: 1 },
  data: { published: true },
})

// Delete
await prisma.post.delete({ where: { id: 1 } })

// Cleanup
await prisma.$disconnect()
```

If the application needs a shared/tuned pool, pass it explicitly and close it as the owner:

```typescript
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// application shutdown
await prisma.$disconnect()
await pool.end()
```

## Common mistakes

| Mistake | Error | Fix |
|---|---|---|
| Importing the generated directory root | `Cannot find module` or wrong export | Import its `client` entrypoint using the configured output path |
| `new PrismaClient()` | `PrismaClient needs non-empty options` | Pass `{ adapter }` |
| `new PrismaClient({ datasourceUrl: url })` | `Unknown property datasourceUrl` | Use adapter pattern instead |
| ESM/CJS settings disagree | import/require errors | Align package/TS settings or set generator `moduleFormat = "cjs"` |
| Importing `@prisma/client` with the `prisma-client` generator | Wrong export/path | Import from the configured generated output |
