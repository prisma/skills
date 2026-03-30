# oauth2-flow

OAuth2 authorization flow for the Prisma Management API. Required for operations that act on behalf of end users, such as transferring projects.

## Overview

The flow uses Authorization Code with PKCE (Proof Key for Code Exchange):

1. Your app redirects the user to Prisma's authorization endpoint
2. The user authenticates and grants permission
3. Prisma redirects back to your app with an authorization code
4. Your app exchanges the code for access and refresh tokens
5. Use the access token for API calls; refresh when expired

## Authorization endpoint

```
https://auth.prisma.io/authorize
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `client_id` | Yes | Your OAuth application's client ID |
| `redirect_uri` | Yes | Must match the registered redirect URI |
| `response_type` | Yes | Always `code` |
| `scope` | Yes | Space-separated scopes (see below) |
| `state` | Yes | Random string for CSRF protection |
| `code_challenge` | Yes | PKCE challenge derived from a random verifier |
| `code_challenge_method` | Yes | Always `S256` |

### Scopes

| Scope | Description |
|---|---|
| `workspace:admin` | Full access to workspace resources |
| `offline_access` | Receive a refresh token for long-lived access |

Typical scope for integrator flows:

```
workspace:admin offline_access
```

## Token endpoint

```
POST https://auth.prisma.io/token
```

### Exchange authorization code

```bash
curl -X POST https://auth.prisma.io/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=$PRISMA_CLIENT_ID" \
  -d "code=$AUTH_CODE" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "code_verifier=$CODE_VERIFIER"
```

### Response

```json
{
  "access_token": "<ACCESS_TOKEN>",
  "refresh_token": "<REFRESH_TOKEN>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Refresh tokens

```bash
curl -X POST https://auth.prisma.io/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=$PRISMA_CLIENT_ID" \
  -d "refresh_token=$REFRESH_TOKEN"
```

## Using with the SDK

The `createManagementApiSdk` handles PKCE, token exchange, and refresh automatically:

```typescript
import { createManagementApiSdk, type TokenStorage } from '@prisma/management-api-sdk'

const sdk = createManagementApiSdk({
  clientId: process.env.PRISMA_CLIENT_ID!,
  redirectUri: 'https://your-app.com/auth/prisma/callback',
  tokenStorage: myTokenStorage,
})

// Get login URL (generates PKCE challenge automatically)
const { url, state, verifier } = await sdk.getLoginUrl()

// After user returns with code:
await sdk.handleCallback({ code, state, verifier })

// SDK handles token refresh automatically
const { data } = await sdk.client.GET('/v1/workspaces')
```

## Security requirements

- Always validate the `state` parameter on callback to prevent CSRF attacks
- Store `code_verifier` server-side, never expose to the client
- Store tokens encrypted at rest
- Use HTTPS for all redirect URIs
- Implement token rotation: when refreshing, invalidate the old refresh token
