/**
 * Prisma Postgres Provisioning Module
 *
 * Skeleton for SaaS platforms that provision Prisma Postgres databases
 * for their users. Adapt the tenant model, storage, and error handling
 * to your application.
 */

import {
  createManagementApiClient,
  createManagementApiSdk,
  type TokenStorage,
} from '@prisma/management-api-sdk'

// --- Configuration ---

const PRISMA_SERVICE_TOKEN = process.env.PRISMA_SERVICE_TOKEN!
const PRISMA_CLIENT_ID = process.env.PRISMA_CLIENT_ID!
const APP_URL = process.env.APP_URL!
const DEFAULT_REGION = 'us-east-1'

// --- Service token client (for provisioning) ---

const client = createManagementApiClient({
  token: PRISMA_SERVICE_TOKEN,
})

// --- Provisioning ---

interface ProvisionResult {
  projectId: string
  databaseId: string
  connectionString: string
  directConnectionString: string
}

async function provisionDatabase(
  tenantName: string,
  region = DEFAULT_REGION,
): Promise<ProvisionResult> {
  const { data: project } = await client.POST('/v1/projects', {
    body: {
      name: `tenant-${tenantName}`,
      region,
      createDatabase: true,
    },
  })

  const database = project.database!
  const connection = database.connections[0]

  return {
    projectId: project.id,
    databaseId: database.id,
    connectionString: connection.endpoints.pooled!.connectionString!,
    directConnectionString: connection.endpoints.direct!.connectionString!,
  }
}

// --- OAuth2 token storage (implement with your database) ---

const tokenStorage: TokenStorage = {
  async getTokens() {
    // TODO: Load tokens from your database for the current user
    return null
  },
  async setTokens(tokens) {
    // TODO: Persist tokens to your database for the current user
  },
  async clearTokens() {
    // TODO: Remove tokens from your database for the current user
  },
}

// --- OAuth SDK (for transfer/claim flows) ---

const sdk = createManagementApiSdk({
  clientId: PRISMA_CLIENT_ID,
  redirectUri: `${APP_URL}/auth/prisma/callback`,
  tokenStorage,
})

// --- Claim/Transfer flow ---

interface ClaimInitResult {
  loginUrl: string
  state: string
  verifier: string
}

async function initiateClaim(): Promise<ClaimInitResult> {
  const { url, state, verifier } = await sdk.getLoginUrl()
  return { loginUrl: url, state, verifier }
}

async function handleClaimCallback(
  code: string,
  state: string,
  verifier: string,
): Promise<void> {
  await sdk.handleCallback({ code, state, verifier })
}

async function transferProject(
  projectId: string,
  recipientAccessToken: string,
): Promise<void> {
  await client.POST('/v1/projects/{id}/transfer', {
    params: { path: { id: projectId } },
    body: { recipientAccessToken },
  })
}

// --- Cleanup ---

async function deprovisionDatabase(projectId: string): Promise<void> {
  await client.DELETE('/v1/projects/{id}', {
    params: { path: { id: projectId } },
  })
}

// --- Retry utility ---

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

export {
  provisionDatabase,
  initiateClaim,
  handleClaimCallback,
  transferProject,
  deprovisionDatabase,
  withRetry,
}
