# Schema Changes

Prisma v7 introduces a new `prisma-client` generator. Update your generator block and import paths accordingly.

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
  output   = "../generated"
}
```

## Key Changes

### 1. Provider name

Use `prisma-client` in Prisma v7.

### 2. Output is required (for `prisma-client`)

The `output` field is **mandatory** when using `prisma-client`. Prisma Client no longer generates to `node_modules` with this generator.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated"  // Required for prisma-client
}
```

### 3. Engine type removed

`engineType` is removed in Prisma v7. Remove any `engineType` setting from your generator block.

## Example Output Paths (prisma-client)

### Standard project

```prisma
output = "../generated"
```

Creates: `generated/client`

### Monorepo

```prisma
output = "../../packages/database/generated"
```

### Same directory as schema

```prisma
output = "./generated"
```

Creates: `prisma/generated/client`

## Datasource Block

The `url`, `directUrl`, and `shadowDatabaseUrl` values now live in `prisma.config.ts` in Prisma v7. Keep only the provider in `schema.prisma`:

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
  output   = "../generated"
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
   // Before (prisma-client-js)
   import { PrismaClient } from '@prisma/client'
   
   // After (prisma-client, output = "../generated")
   import { PrismaClient } from '../generated/client'
   ```

3. Update .gitignore (if using `prisma-client` output):
   ```
   generated
   ```

## Preview Features

Preview features work the same:

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../generated"
  previewFeatures = ["relationJoins", "fullTextSearch"]
}
```
