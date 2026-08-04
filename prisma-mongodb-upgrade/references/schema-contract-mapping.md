# schema-contract-mapping

How v6 MongoDB schema concepts map onto Prisma Next's contract model.

## Priority

HIGH

## Why It Matters

Prisma Next does not consume the v6 `schema.prisma` as-is: the schema becomes a *contract*
(authored in PSL or TypeScript via the contract builder), and several v6 MongoDB idioms have
different — or deliberately absent — equivalents. Translating mechanically without knowing
the mapping produces contracts that fail verification or, worse, silently change collection
addressing.

## The mapping

| v6 concept | Prisma Next equivalent | Notes |
|------------|------------------------|-------|
| `datasource db { provider = "mongodb" }` + `url = env(...)` ([v6 docs](https://www.prisma.io/docs/orm/overview/databases/mongodb#example)) | `defineConfig` from `@prisma/orm-mongo/config`, normally scaffolded by `prisma-next init --target mongodb` | Next selects MongoDB through the `@prisma/orm-mongo` façade, not a datasource provider in the old schema |
| `@id @default(auto()) @map("_id") @db.ObjectId` ([using ObjectId](https://www.prisma.io/docs/orm/overview/databases/mongodb#using-objectid)) | ObjectId-typed id field in the Next contract (PSL or TS builder) | Verify the exact attribute surface against the installed Next version's `prisma-next-contract` skill — the contract builder also exposes `index` and `valueObject` |
| Composite (embedded) types — MongoDB-only in v6 ([composite types](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/composite-types)) | Value objects / embedded shapes in the Next contract (`valueObject` in the Mongo contract builder) | Same conceptual role: documents embedded in a parent document |
| Model names address the client (`prisma.user`) | **Collection storage names** address the ORM: `db.orm.users`, i.e. the `@@map(...)` name or the lowercased model name — not `db.orm.User` | prisma-next `skills/prisma-next/SKILL.md`, `skills/prisma-next-quickstart/SKILL.md`; the most common porting mistake |
| Indexes declared in schema, applied by `db push` | Indexes are contract-declared and applied through migrations (`createIndex`/`dropIndex` factories) | See `migrations-mapping.md` |
| No native polymorphism | No schema-layer polymorphism on Mongo either: `@@base`/`@@discriminator` are SQL-only in Next; model an explicit `discriminator` field | prisma-next `skills/prisma-next-contract/SKILL.md` |

## Bad

```typescript
// Ported from v6 and addressed by model name:
const user = await db.orm.User.first(); // undefined — Mongo ORM keys are storage names
```

## Good

```typescript
// Mongo ORM keys are collection storage names (@@map or lowercased model name):
const user = await db.orm.users.first();
```

## Environment requirements

`@prisma/orm-mongo@0.16.0` declares `mongodb@^7` as a user-installed peer dependency; Prisma Next requires Node.js 24+ and declares MongoDB 8.0 as the Mongo target minimum. Run `prisma-next init --probe-db` and inspect the version message before planning a migration. `--strict-probe` escalates connection/probe failures, not a successfully detected below-minimum version; v6 supports older environments.

## References

- [v6 MongoDB schema documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb)
- [v6 composite types (MongoDB-only)](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/composite-types)
- Prisma Next contract skill (`skills/prisma-next-contract`) in `prisma/prisma` — authoritative for the Next side
