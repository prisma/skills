# sdk-reference

API reference for `@prisma/management-api-sdk`.

## Installation

```bash
npm install @prisma/management-api-sdk
```

## `createManagementApiClient`

Lightweight client for service token authentication. Use for server-to-server operations (provisioning, listing, deleting).

```typescript
import { createManagementApiClient } from '@prisma/management-api-sdk'

const client = createManagementApiClient({
  token: process.env.PRISMA_SERVICE_TOKEN!,
})
```

### Typed endpoint methods

The client exposes typed methods matching HTTP verbs:

```typescript
// List projects
const { data: projects } = await client.GET('/v1/projects')

// Create project with database
const { data: project } = await client.POST('/v1/projects', {
  body: {
    name: 'my-project',
    region: 'us-east-1',
    createDatabase: true,
  },
})

// Get database by ID
const { data: database } = await client.GET('/v1/databases/{databaseId}', {
  params: { path: { databaseId: 'db_abc123' } },
})

// Create connection
const { data: connection } = await client.POST('/v1/databases/{databaseId}/connections', {
  params: { path: { databaseId: 'db_abc123' } },
  body: { name: 'production' },
})

// Delete project
await client.DELETE('/v1/projects/{id}', {
  params: { path: { id: 'proj_abc123' } },
})

// Transfer project
await client.POST('/v1/projects/{id}/transfer', {
  params: { path: { id: 'proj_abc123' } },
  body: { recipientAccessToken: 'eyJ...' },
})
```

## `createManagementApiSdk`

Full SDK with OAuth2 flow and automatic token refresh. Use for operations that require user authorization (transfer/claim flows).

```typescript
import { createManagementApiSdk, type TokenStorage } from '@prisma/management-api-sdk'

const sdk = createManagementApiSdk({
  clientId: process.env.PRISMA_CLIENT_ID!,
  redirectUri: 'https://your-app.com/auth/prisma/callback',
  tokenStorage: myTokenStorage,
})
```

### OAuth flow methods

```typescript
// Step 1: Get login URL
const { url, state, verifier } = await sdk.getLoginUrl()
// Redirect the user to `url`

// Step 2: Handle callback (exchange code for tokens)
await sdk.handleCallback({ code, state, verifier })

// Step 3: Use the client (tokens are automatically included)
const { data: workspaces } = await sdk.client.GET('/v1/workspaces')

// Logout
await sdk.logout()
```

### `TokenStorage` interface

```typescript
interface TokenStorage {
  getTokens(): Promise<{ accessToken: string; refreshToken: string } | null>
  setTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void>
  clearTokens(): Promise<void>
}
```

See `references/oauth2-flow.md` for the complete OAuth2 flow details.

## References

- [Management API SDK docs](https://www.prisma.io/docs/postgres/introduction/management-api-sdk)
- [Management API docs](https://www.prisma.io/docs/postgres/introduction/management-api)
