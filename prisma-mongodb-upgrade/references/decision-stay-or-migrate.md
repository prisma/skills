# decision-stay-or-migrate

How to decide between staying on Prisma v6 and migrating a MongoDB project to Prisma Next.

## Priority

CRITICAL

## Why It Matters

MongoDB projects cannot follow the general "upgrade Prisma" advice: Prisma 7 has no MongoDB
connector, so the only forward path is Prisma Next — which is Early Access. Advising a
production team onto a pre-1.0 stack, or silently rewriting their app onto SQL, are both
serious failure modes. The correct default today is a deliberate stay on v6.

## The facts the decision rests on

Prisma Next side (verified against prisma/prisma-next @ `a2791c5dd59d579b4b3052942ae7f8fe5e2ee852`):

- The MongoDB target is one of two roadmap **POCs** ("validating that non-SQL targets work
  within the framework"); the Early Access target set is Postgres plus one SQL database, and
  GA is Postgres-only — MongoDB is in neither (`ROADMAP.md`, `README.md`).
- The implementation itself is deep, not a stub: a full package family (ORM, typed
  aggregation-pipeline builder, raw lane, driver over the official `mongodb` package),
  first-class contract-driven migrations, and extensive tests against real in-memory MongoDB.
- **The Mongo client façade has no `db.transaction(...)`** — multi-document atomicity
  requires the MongoDB driver's session API directly (prisma-next
  `skills/prisma-next-queries/SKILL.md`, `skills/prisma-next-runtime/SKILL.md`).
- Pre-1.0 churn is real: the 0.11→0.12 release changed Mongo validator emission and made
  `mongodb` a user-supplied peer dependency (`CHANGELOG.md`); floor is MongoDB 8.0 and
  `mongodb@^7`.

Prisma v6 side:

- v6 fully supports MongoDB, including transactions on replica sets — "MongoDB only allows
  you to start a transaction on a replica set. Prisma ORM uses transactions internally"
  ([replica set configuration](https://www.prisma.io/docs/orm/overview/databases/mongodb#replica-set-configuration)).
- v6 MongoDB has no Prisma Migrate; the workflow is `db push`
  ([no support for Prisma Migrate](https://www.prisma.io/docs/orm/overview/databases/mongodb#no-support-for-prisma-migrate)).

## No-go signals for migrating now

Treat each of these as a hard stop for the migrate-now branch:

- **The app relies on `$transaction` / multi-document atomicity.** Next's Mongo façade does
  not wrap transactions yet; the only workaround is hand-written raw driver sessions.
- **The team cannot absorb pre-1.0 breaking upgrades.** Next publishes versioned upgrade
  recipes between minors; someone has to run them.
- **The operator has not explicitly accepted Early Access status.** Do not migrate a
  production app to a POC-classified target on your own initiative.

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
Agent: "Prisma 7 does not support MongoDB, and never will — v6 is the last classic-ORM
major for MongoDB. Your real options are: (a) stay on the latest 6.x deliberately (the
right default for production today), or (b) migrate to Prisma Next, the successor, whose
MongoDB target is functional but Early Access. Does your app use $transaction? That is
currently a no-go for Next..."
```

## Stay-on-v6 hygiene

Staying is a decision, not a default-by-neglect:

- Pin `prisma` and `@prisma/client` to the latest 6.x and keep taking 6.x patches.
- Watch Prisma release notes and security advisories for the 6.x maintenance line.
- Keep the classic setup (`url = env("DATABASE_URL")` in the schema; `db push`; no SQL
  driver adapters).
- Schedule a revisit (quarterly is reasonable). Re-evaluate when Prisma Next's MongoDB
  target joins the supported EA/GA set and façade transactions land.

## References

- [Prisma Next repository (roadmap, README)](https://github.com/prisma/prisma-next)
- [Prisma v6 MongoDB documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb)
