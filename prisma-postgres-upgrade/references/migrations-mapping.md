# migrations-mapping

Prisma 8 owns migrations in `migrations/app/` while it keeps reading `prisma/schema.prisma`.

## Priority

HIGH

## Why It Matters

The Compute deploy creates an empty database per branch and applies `migrations/app/` to it.
Without a baseline there, previews and production deploy with no tables. Keeping
`prisma migrate` alongside Prisma 8 splits the migration history in two.

## Hand over

After `db sign` (see `schema-contract-mapping.md`):

```bash
npx prisma migration plan --name init   # Planned baseline (N operation(s)) + 0 operation(s)
npx prisma db migrate                   # (no operations) on the signed database
rm -r prisma/migrations                 # includes migration_lock.toml
```

- The baseline in `migrations/app/<timestamp>_baseline` creates every table, index and foreign
  key in the contract, so a signed database skips it and an empty one applies it.
- `--name` is ignored when the plan has no operations of its own beyond the baseline.
- Prisma 8 does not read `prisma/migrations`. Keep `prisma/schema.prisma`: it is still the
  contract.
- The `_prisma_migrations` table stays in the database. Prisma 8 ignores it in `db verify` and
  `contract infer`; dropping it is the user's call.
- Remove `prisma migrate dev`, `prisma migrate deploy` and `prisma db seed` scripts, and the
  `"prisma": { "seed": ... }` key, because Prisma 8 has no seed command; a seed is a `tsx` script that
  imports the client.

## Every later schema change

Edit `prisma/schema.prisma`, then:

```bash
npx prisma contract emit
npx prisma migration plan --name <change>
npx prisma db migrate --advance-ref db
npx prisma db verify
```

`--advance-ref db` points `migrations/app/refs/db.json` at the new contract, so the next plan diffs from it.

## Bad

```bash
npx prisma7 migrate dev   # or keeping prisma/migrations "for now"
```

## Good

```bash
npx prisma migration plan --name init && rm -r prisma/migrations
```

## References

- [Guide, step 3](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql-compute#3-hand-migrations-to-prisma-8)
- [How migrations work](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
