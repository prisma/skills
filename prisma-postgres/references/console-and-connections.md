# console-and-connections

Use Prisma Console workflows for project visibility, data inspection, and connection setup.

## Priority

HIGH

## Why It Matters

Many Prisma Postgres tasks are quickest in the Console: viewing Studio data, checking metrics, and retrieving connection details. This avoids unnecessary API or CLI work for simple operational tasks.

## Console workflow

1. Open `https://console.prisma.io`.
2. Select workspace and project.
3. Use dashboard metrics for usage and billing visibility.
4. Open the **Studio** tab in the sidebar to inspect and edit data.

## Local Studio

You can also inspect data locally:

```bash
npx prisma studio
```

## Connection setup

For direct PostgreSQL tools and drivers:

- Generate/copy direct connection credentials from the project connection UI.
- Use the resulting PostgreSQL URL as `DATABASE_URL` for `pg` and `@prisma/adapter-pg`.
- For Prisma Postgres direct TCP, include `sslmode=require`.

Typical direct TCP format:

```env
DATABASE_URL="postgres://identifier:key@db.prisma.io:5432/postgres?sslmode=require"
```

## Adapter choices

- Standard Node.js apps: prefer `@prisma/adapter-pg` with the direct TCP URL above.
- Edge/serverless runtimes: use `@prisma/adapter-ppg` with `@prisma/ppg` only when you specifically need the Prisma Postgres serverless driver.

## References

- [Prisma Postgres overview](https://www.prisma.io/docs/postgres/introduction/overview)
- [Viewing data](https://www.prisma.io/docs/postgres/integrations/viewing-data)
- [Direct connections](https://www.prisma.io/docs/postgres/database/direct-connections)
