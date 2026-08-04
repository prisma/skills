# decision-stay-or-migrate

How to decide between migrating a MongoDB project to Prisma Next and staying on Prisma v6.

## Priority

CRITICAL

## Why It Matters

MongoDB projects cannot follow the general "upgrade Prisma" advice: Prisma 7 has no MongoDB
connector, so the forward path is Prisma Next. Advising an impossible v7 upgrade, or
silently rewriting the app onto SQL, are both serious failure modes. The encouraged path is
migrating to Prisma Next — its MongoDB support is Early Access and the Prisma team wants
early adopters' feedback — with a deliberate stay on v6 where a hard blocker applies.

## The facts the decision rests on

Prisma Next side:

- **MongoDB support is Early Access**, actively developed, with GA planned after Postgres.
- The implementation is deep, not a stub: a full package family (ORM, typed
  aggregation-pipeline builder, raw lane, driver over the official `mongodb` package),
  first-class contract-driven migrations, and extensive tests against real in-memory MongoDB.
- **The Mongo client façade does not wrap `db.transaction(...)` yet** — multi-document
  atomicity is done through the MongoDB driver's session API, which is directly available
  (the `mongodb` package is a user-supplied peer dependency).
- Early Access means pre-1.0 minors can carry breaking changes, with published upgrade
  recipes (e.g. 0.11→0.12 changed Mongo validator emission and made `mongodb` a
  user-supplied peer dependency). The 0.16 façade requires `mongodb@^7` and declares MongoDB 8.0 as its server floor.

Prisma v6 side:

- v6 fully supports MongoDB, including transactions on replica sets — "MongoDB only allows
  you to start a transaction on a replica set. Prisma ORM uses transactions internally"
  ([replica set configuration](https://www.prisma.io/docs/orm/overview/databases/mongodb#replica-set-configuration)).
- v6 MongoDB has no Prisma Migrate; the workflow is `db push`
  ([no support for Prisma Migrate](https://www.prisma.io/docs/orm/overview/databases/mongodb#no-support-for-prisma-migrate)).

## Blocker checks before migrating

Run these checks yourself — from the codebase, not by asking the user:

- **Search the codebase for `$transaction` usage** (`rg '\$transaction'`). If present,
  plan the raw-driver session equivalents before migrating (see `client-api-mapping.md`) —
  or stay on v6 until the façade exposes transactions.
- **Read the MongoDB server version** with the project's existing driver/admin tooling; 0.16 requires MongoDB 8.0+. During a staged Prisma Next init, add `--probe-db` and inspect the reported value. Do not run `init` in the production working tree solely to check a version. `--strict-probe` escalates probe failures but a successfully detected below-minimum server is still reported as a warning.
- **Confirm the team can absorb pre-1.0 upgrades.** Next publishes versioned upgrade recipes
  between minors; someone has to run them. For a production app, confirm the user accepts
  Early Access status before migrating.

## Bad

```text
User: "We're on Prisma 6 with MongoDB. Should we upgrade to Prisma 7?"
Agent: "Yes — here's the v7 upgrade guide. Step 1: install a driver adapter..."
```

Prisma 7 has no MongoDB connector; this migration is impossible and the SQL driver-adapter
steps corrupt a working v6 setup.

## Good

```text
User: "We're on Prisma 6 with MongoDB. Should we upgrade to Prisma 7?"
Agent: "Prisma 7 does not support MongoDB — v6 is the last classic-ORM
major for MongoDB. The path forward is Prisma Next, the successor: its MongoDB support is
Early Access and migrating is encouraged. Let me check the codebase for blockers first —
searching for $transaction usage and checking the MongoDB server version..."
```

## Stay-on-v6 hygiene

Staying is a decision, not a default-by-neglect:

- Pin `prisma` and `@prisma/client` to the latest 6.x and keep taking 6.x patches.
- Watch Prisma release notes and security advisories for the 6.x maintenance line.
- Keep the classic setup (`url = env("DATABASE_URL")` in the schema; `db push`; no SQL
  driver adapters).
- Re-evaluate when Prisma Next's MongoDB is GA, or when blockers for trying EA are resolved.

## References

- [Prisma repository (Prisma Next on main)](https://github.com/prisma/prisma)
- [Prisma v6 MongoDB documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb)
