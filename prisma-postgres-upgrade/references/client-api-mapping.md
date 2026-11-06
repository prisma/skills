# client-api-mapping

Map each Prisma ORM 6 or 7 call to the Prisma 8 client; four differences break most rewrites.

## Priority

CRITICAL

## Why It Matters

The Prisma 8 client chains calls instead of taking one options object, and a schema read
through `prisma7Schema(...)` changes a few lookups and types. Some of these compile and then
fail at runtime or write wrong data.

## Old call to new call

Queries start at `db.orm.public.<Model>`. For the client itself and anything not listed here,
follow the synced `prisma-8` skill (`references/queries.md`, `references/runtime.md`); on
Compute the client comes from `service.load().db.client` (see `compute-setup-pr-fixes.md`).

| Prisma ORM 6 / 7 | Prisma 8 |
|------------------|----------|
| `findMany({ where, orderBy })` | `.where({...}).orderBy((m) => m.field.asc()).all()` |
| `include: { _count: { select: { posts: true } } }` | `.include("posts", (p) => p.count())`; the number is `row.posts` |
| `orderBy: { votes: { _count: "desc" } }` | `.orderBy((p) => p.votes.count().desc())` |
| `findUnique({ where: { id } })` | `.whereUnique({ id }).first()` |
| `findUnique` on an `@unique` or `@@unique` field | `.where({...}).first()` |
| `create({ data: { ..., votes: { create: {...} } } })` | `.create({ ..., votes: (v) => v.create([{...}]) })` |
| `deleteMany({ where })` then `.count` | `.where({...}).deleteAndCount()` |
| `count({ where })` | `.where({...}).aggregate((a) => ({ total: a.count() }))` |
| `Object.values(PostStatus)` from `@prisma/client` | `db.nativeEnums.public.PostStatus.values` |

What has no Prisma 8 form yet, such as `increment` in an update, is listed in
[Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7#queries).

## The four differences

1. **`whereUnique` only on the primary key.** A 6/7 `@unique` or `@@unique` becomes a unique
   index, which `whereUnique` does not accept. Use `.where({...}).first()`.
2. **Enums are under `db.nativeEnums`**, not `db.enums`. The values are the same strings.
3. **`DateTime` may read as a string** (`"2026-11-06 09:10:48.497"`, UTC, no offset) at
   `@prisma/orm-postgres@8.0.0-rc.20`. `row.createdAt.toISOString()` then throws at runtime,
   often in a template `tsc` never checks. Check the installed version's behavior in the
   `prisma-8` skill before converting.
4. **`@default(now())` is filled by the database** at rc.20, so a `timestamp` column gets the
   database's local time where 6/7 sent UTC. If `SHOW timezone` is not `UTC`, tell the user
   rather than changing data.

## Bad

```typescript
const board = await db.orm.public.Board.whereUnique({ slug }).first(); // does not compile
const label = post.createdAt.toISOString(); // compiles in an .ejs view, throws at runtime
```

## Good

```typescript
const board = await db.orm.public.Board.where({ slug }).first();
```

## References

- [Guide, step 5](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#5-rewrite-your-queries)
- The synced `prisma-8` skill, authoritative for the installed client
