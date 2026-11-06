# compute-setup-pr-fixes

The Console's setup pull request needs these edits before a `tsc`-built app deploys and works.

## Priority

CRITICAL

## Why It Matters

On Compute, `DATABASE_URL` is a reserved variable holding the placeholder `-`. An app that keeps
reading it deploys, then fails every query with `P1001` and `host: "base"`. And only the build
output (`dist/`) ships, so anything the server loads from outside it is missing at runtime.

## What the setup pull request adds

On branch `prisma-cloud/setup`, titled **Set up Prisma Cloud deploys**:
`.github/workflows/prisma-deploy.yml` (deploys every push: default branch to production, others
to previews), `module.mjs`, a root `service.mjs`, a `composer` section in `prisma.config.ts`, and
the Composer packages. It keeps the `prisma` and `@prisma/orm-postgres` versions already in
`package.json`. The setup branch deploys as a preview; merging deploys production.

## The fixes

1. **Move the service into the build.** The root `service.mjs` has no types (TS7016 when
   imported) and is not in `dist/`, so `require("../service.mjs")` fails on Compute with
   `Cannot find module`. Delete it and write `src/service.mts`:

   ```typescript
   import node from "@prisma/composer/node";
   import { compute } from "@prisma/composer-prisma-cloud";
   import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
   import type { Contract } from "./prisma/contract.js";
   import contractJson from "./prisma/contract.json" with { type: "json" };

   export default compute({
     name: "<keep the name the setup wrote>",
     deps: { db: postgres(dataContract<Contract>(contractJson)) },
     build: node({ module: import.meta.url, dir: ".", entry: "server.js", dependencies: "external" }),
   });
   ```

   In `module.mjs`, import `./dist/service.mjs` instead of `./service.mjs`.
2. **Check `entry`.** The setup guesses it and can be wrong (it wrote `index.js` for an app
   whose `npm start` runs `server.js`); it is the file in `dist/` that `npm start` runs.
3. **`dependencies: "external"`.** `tsc` does not bundle, so the deploy must ship `node_modules`
   packages the entry imports.
4. **Take the client from the service.**

   ```typescript
   // src/db.ts
   import service from "./service.mjs";
   export const db = service.load().db.client;
   ```

   `service.load().db.url` is there for a library that needs a connection string. Outside a
   Composer run, `service.load()` throws `missing required config param "url"`, so run locally
   with `npm run build && npx prisma dev module.mjs` (Node.js 24.11+). It starts a local
   Prisma Postgres, applies `migrations/app/`, and prints `dev: ready`. That database is empty.
5. **Ship runtime files.** Copy `views/`, `public/` or similar into `dist/` in `build`
   (`tsc && cp -R views public dist/`) and resolve them from `__dirname`. Otherwise every
   rendered page fails with `Failed to lookup view`.
6. **Environment variables.** Every variable other than the database and `PORT` goes in with
   `prisma project env add KEY --role production` and `--role preview`, value read from the
   environment. Ask the user for values; never invent secrets. `prisma dev` does not pass shell
   variables, so a variable required at startup needs a local default or a service input.

Then ask the user before pushing. After the push, `npx prisma service list --branch
prisma-cloud/setup` shows the preview URL.

## Bad

```typescript
export const db = postgres({ contract, url: process.env["DATABASE_URL"]! }); // "-" on Compute
```

## Good

```typescript
export const db = service.load().db.client;
```

## References

- [Guide, step 6](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#6-deploy-on-prisma-compute)
- `prisma-compute` skill, and the synced `prisma-composer-core-concepts` skill
