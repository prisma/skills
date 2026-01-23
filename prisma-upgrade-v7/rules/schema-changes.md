# Schema Changes

Prisma v7 requires updates to your generator block in schema.prisma.

## Generator Provider

### Before (v6)

```prisma
generator client {
  provider = "prisma-client-js"
  engineType = "binary"  // or "library"
}
```

### After (v7)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```

## Key Changes

### 1. Provider name

- Old: `prisma-client-js`
- New: `prisma-client`

The new provider uses the Rust-free TypeScript client for:
- Faster queries
- Smaller bundle size
- No binary downloads
- Better serverless/edge support

### 2. Output is required

The `output` field is now **mandatory**. Prisma Client no longer generates to `node_modules`.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"  // Required
}
```

### 3. Engine type removed

The `engineType` option is removed. The new client doesn't use Rust engines.

## Recommended Output Paths

### Standard project

```prisma
output = "../generated/prisma"
```

Creates: `generated/prisma/client/`

### Monorepo

```prisma
output = "../../packages/database/generated"
```

### Same directory as schema

```prisma
output = "./generated"
```

Creates: `prisma/generated/client/`

## Datasource Block

The `url`, `directUrl`, and `shadowDatabaseUrl` in datasource are deprecated. Configure in `prisma.config.ts` instead:

### Before (v6)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### After (v7)

```prisma
datasource db {
  provider = "postgresql"
  // URLs configured in prisma.config.ts
}
```

```typescript
// prisma.config.ts
export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: env('DIRECT_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
})
```

## Full Example

### v6 Schema

```prisma
generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### v7 Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

## After Schema Changes

1. Run `prisma generate`:
   ```bash
   npx prisma generate
   ```

2. Update imports throughout your codebase:
   ```typescript
   // Before
   import { PrismaClient } from '@prisma/client'
   
   // After
   import { PrismaClient } from './generated/prisma/client'
   ```

3. Update .gitignore:
   ```
   generated/prisma
   ```

## Preview Features

Preview features work the same:

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../generated/prisma"
  previewFeatures = ["relationJoins", "fullTextSearch"]
}
```
