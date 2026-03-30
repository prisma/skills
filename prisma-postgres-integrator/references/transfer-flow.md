# transfer-flow

The project transfer flow moves a project (and all its databases) from the partner's workspace to an end user's workspace.

## When to use

Use the transfer flow when:

- An end user wants to "claim" a database provisioned by your platform
- You want to give users full ownership of their database in Prisma Console
- The database needs to move from your billing to the user's billing

## Flow overview

```
1. Partner provisions project + database (service token)
2. End user authenticates via OAuth2 (gets access token)
3. Partner calls POST /v1/projects/{id}/transfer with the user's access token
4. Project moves to the user's workspace
```

## API call

```
POST /v1/projects/{id}/transfer
```

**Authentication:** The request itself must be authenticated with the partner's service token (or OAuth token) — this proves the partner owns the project.

**Request body:**

```json
{
  "recipientAccessToken": "eyJ..."
}
```

The `recipientAccessToken` is the end user's OAuth2 access token, obtained through the OAuth flow described in `references/oauth2-flow.md`.

**Response:** `204 No Content` on success.

## Complete transfer implementation

```typescript
import { createManagementApiClient } from '@prisma/management-api-sdk'

const partnerClient = createManagementApiClient({
  token: process.env.PRISMA_SERVICE_TOKEN!,
})

async function transferToUser(projectId: string, userAccessToken: string) {
  const response = await partnerClient.POST('/v1/projects/{id}/transfer', {
    params: { path: { id: projectId } },
    body: { recipientAccessToken: userAccessToken },
  })

  if (response.response.status === 204) {
    // Transfer successful — update your records
    // The project is now in the user's workspace
    return { success: true }
  }

  // Handle errors
  throw new Error(`Transfer failed: ${response.response.status}`)
}
```

## After transfer

- The project no longer appears in the partner's workspace
- The user can see and manage the project in their Prisma Console
- Billing shifts to the user's workspace plan
- The partner should update their internal records to reflect the transfer
- Existing connection strings continue to work (the database itself doesn't move)

## Error handling

| Scenario | HTTP Status | Resolution |
|---|---|---|
| Invalid recipient token | 401 | The user's OAuth token is expired. Trigger a token refresh. |
| Project not found | 404 | The project was deleted or already transferred. Check your records. |
| Permission denied | 403 | The partner's token lacks access to the project. Verify workspace scope. |
| Recipient has no workspace | 422 | The user needs to create a workspace in Prisma Console first. |
