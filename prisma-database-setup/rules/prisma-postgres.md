# Prisma Postgres Setup

Configure Prisma with Prisma Postgres (Managed).

## Overview

Prisma Postgres is a serverless, managed PostgreSQL database optimized for Prisma.

## Setup via CLI

You can provision a Prisma Postgres instance directly via the CLI:

```bash
prisma init --db
```

This will:
1. Log you into Prisma Data Platform.
2. Create a new project and database instance.
3. Update your `.env` with the connection string.

## Connection String

The connection string starts with `prisma+postgres://`.

```env
DATABASE_URL="prisma+postgres://api_key@host.prisma-data.net/env_id"
```

## 1. Schema Configuration

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql" // Use postgresql provider
}

generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}
```

## 2. Config Configuration

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

## Features

- **Serverless**: Scales to zero.
- **Caching**: Integrated query caching (Accelerate).
- **Real-time**: Database events (Pulse).

## Using with Prisma Client

Since it uses the standard PostgreSQL provider, usage is standard:

```typescript
import { PrismaClient } from '../generated/client'
const prisma = new PrismaClient()
```

No special adapter is strictly required for the database connection itself if using the standard client, but `prisma+postgres` protocol handles connection pooling automatically.
