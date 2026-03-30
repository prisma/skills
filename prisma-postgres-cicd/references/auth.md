# auth

How to authenticate with the Prisma Management API using service tokens.

## Service Tokens

Service tokens authenticate server-to-server requests. They are scoped to a workspace and grant access to all resources within it.

### Creating a service token

1. Open https://console.prisma.io
2. Navigate to **Workspace Settings** → **Service Tokens**
3. Click **Create Token**
4. Copy the token immediately — it is only shown once

### Using in CI/CD

Store the service token as an encrypted secret in your CI system:

- **GitHub Actions**: Settings → Secrets and variables → Actions → New repository secret → name it `PRISMA_SERVICE_TOKEN`
- **GitLab CI**: Settings → CI/CD → Variables → Add variable → name it `PRISMA_SERVICE_TOKEN`, mark as masked
- **CircleCI**: Project Settings → Environment Variables → Add → name it `PRISMA_SERVICE_TOKEN`

Reference the secret in your workflow:

```yaml
env:
  PRISMA_SERVICE_TOKEN: ${{ secrets.PRISMA_SERVICE_TOKEN }}
```

### Security practices

- Never hardcode tokens in workflow files or source code
- Use encrypted secrets provided by your CI platform
- Rotate tokens periodically via Console → Workspace Settings → Service Tokens
- Use a dedicated service token for CI (separate from development tokens)
