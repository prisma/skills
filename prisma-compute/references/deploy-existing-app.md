# deploy-existing-app

Deploy an existing Prisma 8 server built with `tsc` on Compute: finish the Console's setup pull
request, or write the same files without one.

## Priority

CRITICAL

## Why It Matters

On Compute, `DATABASE_URL` is a reserved variable holding the placeholder `-`. An app that keeps
reading it deploys, then fails every query with `P1001` and `host: "base"`. And only the build
output (`dist/`) ships, so anything the server loads from outside it is missing at runtime.

The app must be on Prisma 8 first. A Prisma ORM 6 or 7 app upgrades with the
`prisma-postgres-upgrade` skill, then comes back here.

Fixes 1 to 3 and 5 work around current gaps in the setup pull request, which the Console is
fixing. Read what the pull request already contains first, and only change what it gets wrong.

A `tsc` app loads its service from `dist/`, so it uses `module.mjs` and `src/service.mts`
rather than the `module.ts` and `service.ts` the rest of this skill shows, and deploys with
`dependencies: "external"` instead of a `bun build` bundle.

## Versions

Install the Composer packages with `--save-exact` at the version that matches the installed
`@prisma/orm-postgres` (today `0.34.0` for `8.0.0-rc.20`), or the versions the setup pull request
wrote. The latest Composer release does not work with an older `@prisma/orm-postgres`. Use
Node.js 24.11 or newer locally: `prisma dev` refuses Node.js 22.

## What the setup pull request adds

On branch `prisma-cloud/setup`, titled **Set up Prisma Cloud deploys**:
`.github/workflows/prisma-deploy.yml` (deploys every push: default branch to production, others
to previews), `module.mjs`, a root `service.mjs`, a `composer` section in `prisma.config.ts`, and
the Composer packages. It keeps the `prisma` and `@prisma/orm-postgres` versions already in
`package.json`. The setup branch deploys as a preview; merging deploys production.

## Without a setup pull request

When the user has not connected the repository in the Console, write these, then apply fixes 1
to 6. Connecting it later (Console, or the interactive `npx prisma git connect`) opens a setup
pull request; reconcile it with these files.

- Install `@prisma/composer` and `@prisma/composer-prisma-cloud` at the version above.
- Add to `prisma.config.ts`:

  ```typescript
  import { defineConfig as composer } from "@prisma/composer/config";
  import { nodeBuild } from "@prisma/composer/node/control";
  import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
  // inside definePrismaConfig({ ... }):
  composer: composer({ extensions: [prismaCloud(), nodeBuild()], state: prismaState() }),
  ```

  Leave the region for the user (`prismaCloud({ region })` or `PRISMA_REGION`); see
  `app-region`.
- `module.mjs`, which provisions the database from the same contract the service uses:

  ```javascript
  import { module } from "@prisma/composer";
  import { postgres } from "@prisma/composer-prisma-cloud/orm";
  import web, { data } from "./dist/service.mjs";

  export default module("<app name>", ({ provision }) => {
    const database = provision(postgres({ name: "database", contract: data, config: "prisma.config.ts" }));
    provision(web, { deps: { db: database } });
  });
  ```

- `.github/workflows/prisma-deploy.yml` from [`deploy-on-push.md`](deploy-on-push.md), with
  `module: module.mjs` in the `prisma/cloud-deploy-action` inputs. The action looks for
  `module.ts` by default.
- `.prisma/`, `.prisma-composer/` and `.alchemy/` in `.gitignore`.

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

   export const data = dataContract<Contract>(contractJson);

   export default compute({
     name: "<keep the name the setup wrote>",
     deps: { db: postgres(data) },
     build: node({ module: import.meta.url, dir: ".", entry: "server.js", dependencies: "external" }),
   });
   ```

   In `module.mjs`, import `./dist/service.mjs` instead of `./service.mjs`.
2. **Check `entry`.** The setup guesses it and can be wrong (it wrote `index.js` for an app
   whose `npm start` runs `server.js`); it is the file in `dist/` that `npm start` runs.
3. **`dependencies: "external"`.** `tsc` does not bundle, so the deploy must ship `node_modules`
   packages the entry imports.
4. **Take the client from the service, and run under Composer.**

   ```typescript
   // src/db.ts
   import service from "./service.mjs";
   export const db = service.load().db.client;
   ```

   - `service.load().db.url` is there for a library that needs a connection string.
   - Listen on `service.port()` and `"0.0.0.0"`, not `process.env.PORT`.
   - Outside a Composer run, `service.load()` throws `missing required config param "url"`. So
     `npm start`, a `tsx` dev script and any `Procfile` stop working. Run locally with
     `npm run build && npx prisma dev module.mjs`, and make that the `dev` script. It starts a
     local Prisma Postgres, applies `migrations/app/`, and prints `dev: ready`. That database is
     empty.
   - A seed script must not import `db.ts`. Keep its own `postgres({ contract, url })` client,
     and seed with `DATABASE_URL="$(npx prisma dev url database)" npx tsx prisma/seed.ts`.
5. **Ship runtime files.** Copy `views/`, `public/` or similar into `dist/` in `build`
   (`tsc && cp -R views public dist/`) and resolve them from `__dirname`. Otherwise every
   rendered page fails with `Failed to lookup view`.
6. **Environment variables.** Pass each variable other than the database and the port as a
   service input, not through `process.env`:

   ```typescript
   // src/service.mts: add to compute({ ... })
   input: type({ sessionSecret: secretString() }), // type from "arktype", secretString from "@prisma/composer/arktype"
   // module.mjs: envSecret from "@prisma/composer-prisma-cloud"
   provision(web, { deps: { db: database }, input: { sessionSecret: envSecret("SESSION_SECRET") } });
   // src/server.ts
   const SESSION_SECRET = service.input().sessionSecret.expose();
   ```

   Add `arktype` as a direct dependency, at the version `@prisma/composer` uses
   (`npm ls arktype`). The user sets the values with `prisma project env add KEY --role
   production` and `--role preview`. Ask the user for values; never invent secrets.

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

- [Deploy an existing app on Prisma Compute](https://www.prisma.io/docs/guides/compute/deploy-existing-app)
- The synced `prisma-composer-core-concepts` skill
