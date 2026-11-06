# client-api-mapping

Prisma ORM 6 and 7 queries map to the Prisma 8 client the same way; four differences break most rewrites.

## Priority

CRITICAL

## Why It Matters

The Prisma 8 client chains calls instead of taking one options object, and a schema read through
`prisma7Schema(...)` changes a few types and lookups. At `@prisma/orm-postgres@8.0.0-rc.20`,
some of these compile fine and fail at runtime or write wrong data.

## The client (local, before Compute)

```typescript
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./prisma/contract.d";
import contractJson from "./prisma/contract.json";

export const db = postgres({
  contract: contractFromJson<Contract>(contractJson),
  url: process.env["DATABASE_URL"]!,
});
```

On Compute this file changes to `service.load().db.client`; see `compute-setup-pr-fixes.md`.

## The mapping

Queries start at `db.orm.public.<Model>` (`public` is the PostgreSQL schema). The last call says
what comes back.

| Prisma ORM 6 / 7 | Prisma 8 |
|------------------|----------|
| `findMany({ where, orderBy })` | `.where({...}).orderBy((m) => m.field.asc()).all()` |
| `include: { _count: { select: { posts: true } } }` | `.include("posts", (p) => p.count())`; the number lands in `row.posts`, not `row._count.posts` |
| `orderBy: { votes: { _count: "desc" } }` | `.orderBy((p) => p.votes.count().desc())`; several: pass an array |
| `findUnique({ where: { id } })` | `.whereUnique({ id }).first()` |
| `findUnique({ where: { slug } })` (`@unique`) | `.where({ slug }).first()` |
| `findUnique({ where: { a_b: { a, b } } })` (`@@unique`) | `.where({ a, b }).first()` |
| `create({ data: { ..., votes: { create: {...} } } })` | `.create({ ..., votes: (v) => v.create([{...}]) })` |
| `deleteMany({ where })` then `.count` | `.where({...}).deleteAndCount()` |
| `count({ where })` | `.where({...}).aggregate((a) => ({ total: a.count() }))` |
| `` $queryRaw`SELECT 1` `` | `` db.query(db.raw.sql`SELECT 1 AS ok`.returnsRow({ ok: "pg/int4@1" }).build()) `` |
| `Object.values(PostStatus)` from `@prisma/client` | `db.nativeEnums.public.PostStatus.values` |

What has no Prisma 8 form yet, such as `increment` in an update, is listed in
[Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7#queries).

## The rc.20 gotchas

1. **`whereUnique` only on `{ id }`.** Each `@unique` and `@@unique` becomes the unique index
   Prisma ORM created, and `whereUnique` accepts only a primary key or unique constraint. Use
   `.where({...}).first()`; it runs the same query.
2. **Enums are under `db.nativeEnums`.** A 6/7 `enum` is a PostgreSQL enum type. `db.enums.public`
   is empty, while field values stay the same strings.
3. **`DateTime` reads as a string**, such as `"2026-11-06 09:10:48.497"` (UTC, no offset).
   `row.createdAt.toISOString()` throws at runtime, often inside a template that `tsc` never
   checks. Grep views and response code for `Date` methods on these fields. Convert with
   `new Date(value.replace(" ", "T") + "Z")` where a `Date` is needed. Later releases return a
   `Date` again.
4. **`@default(now())` is filled by the database.** A `timestamp` column then gets the
   database's local time, where Prisma ORM 6/7 sent UTC. If `SHOW timezone` is not `UTC`, new rows are
   off by the offset; tell the user rather than silently changing data.

## Bad

```typescript
const board = await db.orm.public.Board.whereUnique({ slug }).first(); // does not compile
const label = post.createdAt.toISOString(); // compiles in an .ejs view, throws at runtime
```

## Good

```typescript
const board = await db.orm.public.Board.where({ slug }).first();
const label = post.createdAt.slice(0, 10);
```

## References

- [Guide, step 5](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#5-rewrite-your-queries)
- [ORM client reference](https://www.prisma.io/docs/orm/reference/orm-client)
- The synced `prisma-8` skill, authoritative for the installed client
