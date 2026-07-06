---
name: prisma-mongodb-upgrade
description: Decision and migration guide for Prisma ORM MongoDB projects on v6, which have no upgrade path to v7. Use when a MongoDB project asks about upgrading Prisma, when "upgrade to prisma 7" comes up in a project with provider = "mongodb", or when evaluating a move to Prisma Next. Triggers on "upgrade prisma mongodb", "prisma 7 mongodb", "mongodb prisma migration", "prisma next mongodb".
license: MIT
metadata:
  author: prisma
  version: "0.1.0"
---

# Prisma MongoDB Upgrade Path

MongoDB projects are the one Prisma cohort with no road into Prisma 7: **v6 is the terminal
classic-ORM major for MongoDB, and v7 never ships a MongoDB connector**. The successor path
is [Prisma Next](https://github.com/prisma/prisma-next), which has a working MongoDB target
in active development. This skill frames the real decision — stay on v6 deliberately, or
migrate to Prisma Next now — and carries the migration mechanics for teams that choose to
move.

**Never do either of these:**

- Never advise a MongoDB project to "upgrade to Prisma 7". The connector does not exist
  there. The `prisma-upgrade-v7` guide does not apply to MongoDB projects.
- Never solve the version question by rewriting the app onto a SQL database. Changing the
  database engine is a separate, much larger decision that is not yours to make implicitly.

## The version landscape

| Version | MongoDB status |
|---------|----------------|
| Prisma ORM v6 | Fully supported (`mongodb` provider); latest 6.x is the current production path; maintenance line |
| Prisma ORM v7 | **No MongoDB connector — not an option, ever** |
| Prisma Next | MongoDB target exists and is well-built, but is roadmap-classified as a POC: pre-1.0, Early Access at best, excluded from the current EA/GA target sets |

## The decision, up front

**Default: production MongoDB apps stay on Prisma v6 today — deliberately, not by neglect.**
Prisma Next's own roadmap classifies its MongoDB target as a proof-of-concept and excludes it
from the Early Access and GA target sets; its package line is pre-1.0 with breaking changes
between minors; and its Mongo client façade does not yet expose transactions.

**The migrate-now branch is real** and mechanically detailed in the references — appropriate
for greenfield projects, experiments, and teams that knowingly accept Early Access churn.

### Decision table

| Signal | Direction |
|--------|-----------|
| Production app, availability matters | Stay on v6 |
| App uses multi-document transactions (`$transaction`) | **Stay on v6 — hard no-go for Next today** (the Next Mongo façade has no `db.transaction(...)`; only raw driver sessions) |
| Team cannot absorb pre-1.0 breaking upgrades between minors | Stay on v6 |
| Greenfield / prototype / internal tool | Migrating to Next now is reasonable |
| Team wants to be early on the successor stack and can track releases | Migrate now, with the verification checklist |
| Curious but risk-averse | Stay on v6; run a staged Next round-trip on a copy (see `verify-cutover-checklist`) and revisit each quarter |

### Stay-on-v6 hygiene (the default is active, not passive)

- Pin the Prisma packages to the latest 6.x line and keep taking 6.x patch releases.
- Track Prisma release notes and security advisories for the 6.x line.
- Keep the classic v6 MongoDB setup: `url = env("DATABASE_URL")` in the schema, `db push`
  workflow, no SQL driver adapters (see `prisma-database-setup` for the v6 MongoDB shape).
- Put a revisit date on the decision (e.g. quarterly): the trigger to re-evaluate is Prisma
  Next's MongoDB target entering the officially supported Early Access/GA set and façade
  transactions landing.

## Reference files

| Reference | What it covers |
|-----------|----------------|
| `references/decision-stay-or-migrate.md` | The full decision framing, no-go signals, and stay-hygiene detail |
| `references/schema-contract-mapping.md` | v6 schema (`mongodb` provider, `@db.ObjectId`, composite types) → Next contract concepts |
| `references/client-api-mapping.md` | v6 client calls → Next equivalents, incl. raw escape hatches and transactions — names map, parity does not |
| `references/migrations-mapping.md` | v6 `db push`-only story → Next's plan/migrate/verify/sign flow |
| `references/verify-cutover-checklist.md` | No-data-moves verification: same DB, index parity, staged round-trip before cutover |

## Verified against

Behavioral claims about Prisma Next in this skill were verified against
[prisma/prisma-next](https://github.com/prisma/prisma-next) at commit
`a2791c5dd59d579b4b3052942ae7f8fe5e2ee852` (pre-1.0, ~v0.14/0.15 line). Prisma Next is Early
Access and its surface moves: **before acting on any Next-side claim, verify it against the
version actually installed** (check the project's `@prisma-next/*` versions and the
prisma-next skills installed with it). Next's Mongo target requires MongoDB 8.0+ and expects
`mongodb@^7` as a user-supplied peer dependency.

## Hand-off rule

This skill is the **discovery bridge**, not a replacement for Prisma Next's own
documentation. After a project switches to Prisma Next, run Prisma Next's `init`/skill
installation and follow its own skills (quickstart, contract, queries, migrations, runtime)
for day-to-day work — do not keep working from this skill's summaries.
