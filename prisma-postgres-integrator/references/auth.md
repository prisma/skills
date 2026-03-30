# auth

Authentication methods for the Prisma Management API in integrator workflows.

## Service Tokens (for provisioning)

Service tokens authenticate your backend when provisioning databases. They are workspace-scoped.

### Creating a service token

1. Open https://console.prisma.io
2. Navigate to **Workspace Settings** → **Service Tokens**
3. Click **Create Token**
4. Copy the token immediately — it is only shown once

### Usage

```typescript
import { createManagementApiClient } from '@prisma/management-api-sdk'

const client = createManagementApiClient({
  token: process.env.PRISMA_SERVICE_TOKEN!,
})
```

### Security

- Store in environment variables or a secret manager (AWS Secrets Manager, Vault, etc.)
- Never commit to source code or log in application output
- Rotate periodically via Console → Workspace Settings

## OAuth 2.0 (for user-scoped operations)

OAuth is required when performing operations on behalf of an end user, such as transferring a project to their workspace.

See `references/oauth2-flow.md` for the complete OAuth2 setup.
