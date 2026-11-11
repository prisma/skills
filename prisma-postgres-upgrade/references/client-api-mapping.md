# client-api-mapping

Create the Prisma 8 client, then map each Prisma ORM 6 or 7 call to it; four differences break most rewrites.

## Priority

CRITICAL

## Why It Matters

The Prisma 8 client chains calls instead of taking one options object, and a schema read
through `prisma7Schema(...)` changes a few lookups and types. Some of these compile and then
fail at runtime or write wrong data.

## The client

One client for the app and the seed script, reading the same `DATABASE_URL` as before:

```typescript
// src/db.ts
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./prisma/contract.js";
import contractJson from "./prisma/contract.json";

export const db = postgres({ contract: contractFromJson<Contract>(contractJson), url: process.env["DATABASE_URL"]! });
```

In a CommonJS `.ts` file, import the JSON without the `with { type: "json" }` attribute the
`prisma-8` skill shows: the attribute fails there with TS2856 and is only valid in `.mts` files.
On Compute, `prisma-compute` replaces this client with `service.load().db.client`.

## Old call to new call

Queries start at `db.orm.public.<Model>`. For anything not listed here, follow the synced
`prisma-8` skill (`references/queries.md`, `references/runtime.md`).

| Prisma ORM 6 / 7 | Prisma 8 |
|------------------|----------|
| `findMany({ where, orderBy })` | `.where({...}).orderBy((m) => m.field.asc()).all()` |
| `include: { _count: { select: { posts: true } } }` | `.include("posts", (p) => p.count())`; the number is `row.posts`, not `row._count.posts` |
| `orderBy: { votes: { _count: "desc" } }` | `.orderBy((p) => p.votes.count().desc())` |
| `findUnique({ where: { id } })` | `.first({ id })` |
| `findUnique` on an `@unique` or `@@unique` field | `.where({...}).first()` |
| `create({ data: { ..., votes: { create: {...} } } })` | `.create({ ..., votes: (v) => v.create([{...}]) })` |
| `deleteMany({ where })` then `.count` | `.where({...}).deleteAndCount()` |
| `deleteMany()` with no filter (seeds, tests) | `.where((m) => m.id.isNotNull()).deleteAll()`: writes need a filter |
| `createMany({ data: [...] })` | `.createAll([...])` |
| `count({ where })` | `.where({...}).aggregate((a) => ({ total: a.count() }))` |
| `Object.values(PostStatus)` from `@prisma/client` | `db.nativeEnums.public.PostStatus.values` |
| ``$queryRaw`SELECT 1` `` (health checks) | ``db.execute(db.raw.sql`SELECT 1`.affectedCount().build())`` |

What has no Prisma 8 form yet, such as `increment` in an update, is listed in
[Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7#queries).

## The four differences

1. **Unique lookups use `.first(...)` or `.where(...).first()`.** A 6/7 `@unique` or `@@unique`
   becomes a unique index, which `whereUnique` does not accept, so do not reach for it.
2. **Enums are under `db.nativeEnums`**, not `db.enums`. The values are the same strings.
3. **`@db.Date` and `@db.Time` fields read as strings**, such as `"2026-11-10"` and
   `"10:00:00.5"`, where 6/7 read a `Date`. Write them as strings too. `.toISOString()` or
   `.getTime()` on them throws at runtime, often in a template `tsc` never checks. `DateTime`,
   `@db.Timestamp` and `@db.Timestamptz` still read and write a JavaScript `Date`, in UTC.
4. **Templates and other code `tsc` does not check still read the old shapes.** Search views
   (`.ejs`, `.hbs`, `.pug`) and plain `.js` files for `_count.`, date methods on `@db.Date` and
   `@db.Time` fields, and enum imports, and change them with the queries.

`@default(now())` and `@updatedAt` work as in 6/7: the client writes the current time in UTC on
create, and `@updatedAt` again on update, whatever the database's time zone. An `INSERT` from
outside Prisma still gets the column default.

These date notes hold for `@prisma/orm-postgres` 8.0.0-rc.22 and later. Earlier versions read
`DateTime` differently, so on those, follow the synced `prisma-8` skill.

## Bad

```text
const board = await db.orm.public.Board.whereUnique({ slug }).first(); // does not compile
<%= post._count.votes %> <!-- an .ejs view tsc never checks: undefined after the rewrite -->
```

## Good

```typescript
const board = await db.orm.public.Board.where({ slug }).first();
const post = await db.orm.public.Post.include("votes", (v) => v.count()).first({ id }); // post.votes
```

## References

- [Guide, step 5](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql#5-rewrite-your-queries)
- The synced `prisma-8` skill, authoritative for the installed client
