---
name: prisma-postgres-integrator
description: Build programmatic database provisioning into an application using the Prisma Management API SDK. Use when asked to "build database provisioning into my app", "create databases for my users", "implement a claim flow", "build a reseller integration", or "provision databases programmatically with the SDK".
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma Postgres Integrator

Procedural skill that guides you through building programmatic Prisma Postgres database provisioning into a custom application — for SaaS platforms, resellers, or multi-tenant apps that provision databases for their users.

## When to Apply

Use this skill when:

- Building database provisioning into a SaaS application
- Creating databases programmatically for end users or tenants
- Implementing the claim/transfer flow so users own their databases
- Building a reseller or partner integration with Prisma Postgres
- Using `@prisma/management-api-sdk` for typed API access

Do **not** use this skill when:

- Setting up a single database for local development — use `prisma-postgres-setup`
- Setting up CI/CD preview databases — use `prisma-postgres-cicd`
- Making one-off API calls (use `curl` or the `prisma-postgres` skill's references)

## Prerequisites

- Node.js 18+ with a TypeScript project
- A Prisma Postgres workspace with a service token (for provisioning)
- An OAuth2 application registered with Prisma (for the transfer/claim flow — see `references/oauth2-flow.md`)

## Workflow

### Step 1: Install the SDK

```bash
npm install @prisma/management-api-sdk
```

The SDK provides two entry points:

- `createManagementApiClient` — lightweight client for service token auth (provisioning)
- `createManagementApiSdk` — full SDK with OAuth2 + token refresh (transfer flows)

### Step 2: Set up service token authentication

Service tokens authenticate your backend when provisioning databases on behalf of your application.

```typescript
import { createManagementApiClient } from '@prisma/management-api-sdk'

const client = createManagementApiClient({
  token: process.env.PRISMA_SERVICE_TOKEN!,
})
```

Store `PRISMA_SERVICE_TOKEN` in environment variables. Never hardcode it or log it.

Read `references/auth.md` for how to create a service token.

### Step 3: Implement database provisioning

Create a project with a database for each tenant/user:

```typescript
async function provisionDatabase(tenantName: string, region = 'us-east-1') {
  const { data: project } = await client.POST('/v1/projects', {
    body: {
      name: `tenant-${tenantName}`,
      region,
      createDatabase: true,
    },
  })

  const database = project.database
  const connection = database.connections[0]

  return {
    projectId: project.id,
    databaseId: database.id,
    connectionString: connection.endpoints.pooled.connectionString,
    directConnectionString: connection.endpoints.direct.connectionString,
  }
}
```

Store the returned `projectId` and `databaseId` in your application's database, associated with the tenant. The connection strings are secrets — store them securely.

Read `references/sdk-reference.md` for the full SDK API and `references/endpoints.md` for endpoint details.

### Step 4: Set up OAuth2 for the transfer flow (optional)

The transfer flow lets end users claim databases into their own Prisma workspace. This requires OAuth2 authentication.

```typescript
import { createManagementApiSdk, type TokenStorage } from '@prisma/management-api-sdk'

const tokenStorage: TokenStorage = {
  async getTokens() {
    // Load tokens from your database for the current user
    return null
  },
  async setTokens(tokens) {
    // Persist tokens to your database for the current user
  },
  async clearTokens() {
    // Remove tokens from your database for the current user
  },
}

const sdk = createManagementApiSdk({
  clientId: process.env.PRISMA_CLIENT_ID!,
  redirectUri: `${process.env.APP_URL}/auth/prisma/callback`,
  tokenStorage,
})
```

Read `references/oauth2-flow.md` for the full OAuth2 setup and `references/token-storage.md` for token storage patterns.

### Step 5: Implement the claim/transfer flow

The transfer flow has three stages:

**5a. Initiate OAuth login**

```typescript
async function initiateClaim(userId: string) {
  const { url, state, verifier } = await sdk.getLoginUrl()

  // Store state and verifier in your session/database for this user
  await saveOAuthState(userId, { state, verifier })

  // Redirect the user to this URL
  return url
}
```

**5b. Handle the OAuth callback**

```typescript
async function handleCallback(code: string, state: string, userId: string) {
  const saved = await loadOAuthState(userId)

  // Exchange the authorization code for tokens
  await sdk.handleCallback({
    code,
    state: saved.state,
    verifier: saved.verifier,
  })

  // Tokens are automatically stored via tokenStorage
}
```

**5c. Transfer the project**

```typescript
async function transferProject(projectId: string, recipientAccessToken: string) {
  const response = await client.POST('/v1/projects/{id}/transfer', {
    params: { path: { id: projectId } },
    body: { recipientAccessToken },
  })

  return response
}
```

The `recipientAccessToken` is the end user's OAuth access token (obtained in step 5b). The project is transferred from your workspace to the user's workspace.

Read `references/transfer-flow.md` for the complete flow and error handling.

### Step 6: Add error handling and retries

Wrap API calls with error handling:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const status = (error as { status?: number }).status
      if (status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

Key error scenarios:

| HTTP Status | Error Code | Action |
|---|---|---|
| 401 | `authentication-failed` | Service token expired. Rotate it. For OAuth, refresh the access token. |
| 404 | `resource-not-found` | Project or database was deleted. Update your records. |
| 422 | `validation-error` | Check request body. Common: duplicate project name, invalid region. |
| 429 | `rate-limit-exceeded` | Exponential backoff. Space out provisioning requests. |

### Security Checklist

- Store OAuth tokens encrypted at rest
- Never log connection strings, service tokens, or OAuth tokens
- Use HTTPS for all redirect URIs
- Validate the `state` parameter on OAuth callbacks to prevent CSRF
- Store connection strings with the same security level as database passwords

## Reference Files

```
references/api-basics.md       — Base URL, envelope, IDs, errors, pagination
references/auth.md             — Service token creation and usage
references/sdk-reference.md    — SDK API: createManagementApiClient, createManagementApiSdk
references/endpoints.md        — Endpoint details for projects, databases, connections
references/oauth2-flow.md      — OAuth2 authorization, token exchange, scopes, refresh
references/transfer-flow.md    — Project transfer endpoint and flow
templates/provisioning-module.ts — Complete TypeScript module skeleton
```
