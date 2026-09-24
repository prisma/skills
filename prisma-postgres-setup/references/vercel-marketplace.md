# v0 and Vercel Marketplace

Use the native integration to obtain a database that belongs to the user's Marketplace installation and Vercel project.

1. Inspect whether Prisma Postgres is already connected to the current project and environment. Reuse that resource.
2. If it is not connected, use the host's native integration flow to select an existing resource or create one. In v0 this may appear as an integration request tool; discover what the host exposes instead of assuming a fixed tool name.
3. Wait for the connection and injected environment configuration. Verify which variables the application uses without printing their values.
4. If the app sees a variable but a shell command does not, inspect the framework's environment loading and load the same intended file for the command. An empty shell variable is not a reason to provision another database.
5. Return to `prisma-postgres-setup` for the chosen ORM and query verification.

## Where MCP fits

When native Marketplace MCP tools are available, inspect their descriptions, permissions, and resource scope before use. Use them for supported operations on the selected resource. Keep schema changes consistent with the application's migration workflow.

A general Prisma MCP provisioning tool creates a Prisma resource; that alone does not establish Marketplace registration, billing, project connection, or environment injection. Do not substitute it for a blocked native installation. Report the missing connection or permission.

The agent calls MCP tools while building the app. The generated app connects through its ORM or database driver; it does not need to call MCP for normal database queries.

## Distribution

The host needs this reference and access to `prisma-orm-setup` as well as the main Postgres skill. Do not assume that publishing a GitHub change automatically refreshes v0's registered skill or that every host resolves sibling skills. Verify loading in v0 before releasing updated Marketplace content.

Sources: [v0 databases](https://v0.app/docs/databases), [v0 MCP](https://v0.app/docs/MCP), [Vercel native integrations](https://vercel.com/docs/integrations/create-integration/native-integration).
