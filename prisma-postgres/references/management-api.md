# management-api

Use Prisma Management API for programmatic provisioning and workspace/project/database management.

## Priority

CRITICAL

## Why It Matters

When you need backend automation, multi-tenant onboarding flows, or controlled resource provisioning, the Management API is the source of truth and is more reliable than interactive workflows.

## Base URL

```text
https://api.prisma.io/v1
```

## API exploration

- OpenAPI docs: `https://api.prisma.io/v1/doc`
- Swagger Editor: `https://api.prisma.io/v1/swagger-editor`

## Authentication methods

- Service token: best for server-to-server operations in your own workspace
- OAuth 2.0: best for acting on behalf of users across workspaces

## Service token flow

1. Create token in Prisma Console workspace settings.
2. Send token as Bearer auth:

```text
Authorization: Bearer $TOKEN
```

## OAuth flow summary

1. Redirect user to `https://auth.prisma.io/authorize` with `client_id`, `redirect_uri`, `response_type=code`, and scopes.
2. Receive `code` on callback.
3. Exchange code at `https://auth.prisma.io/token`.
4. Use returned access token in Management API requests.

## Resource model

Workspace -> Project -> Branch -> Database. Branches are a first-class resource: databases attach to a Branch, and branch-scoped env/databases are how preview isolation works.

## Current resource inventory

The 1.55 OpenAPI surface includes:

- workspaces, subscriptions, workspace integrations, workspace service tokens, and current-user metadata
- projects, transfers, project databases, and project/branch environment variables
- branches under a project plus branch get/update/delete operations
- databases, usage, backups, restore, connections, and connection rotation
- apps, deployments, promotion/rollback, runtime logs, domains, and build logs
- buckets and bucket keys
- source repositories, SCM installations/install intents, and repositories
- integrations and regions

App/deployment, branch mutation, SCM, and bucket routes include experimental surfaces. Read the installed SDK types or live OpenAPI before building durable automation around them.

Connection create/rotate responses reveal credentials once. Later reads redact or omit the secret, so store the URL immediately. Use the structured direct/pooled endpoint returned by the concrete operation; do not assume a historical flat response shape.

Workspace service-token creation also returns the complete token value exactly once. List calls expose only metadata and a `valueHint`; delete revokes the token. Keep workspace and token ids opaque, and never log a create response.

Database create supports explicit project, region, branch, and source context. A source may be empty, a backup, or another database. Backup records are incremental; rely on current fields and documented units rather than old full-backup examples.

## Notes

- Management API mutation responses may include direct connection credentials; treat the entire response as secret until redacted.
- Prefer an API-provided connection string over manually assembling one from fields.

## References

- [Management API docs](https://www.prisma.io/docs/postgres/introduction/management-api)
- [OpenAPI docs](https://api.prisma.io/v1/doc)
- [Swagger Editor](https://api.prisma.io/v1/swagger-editor)
