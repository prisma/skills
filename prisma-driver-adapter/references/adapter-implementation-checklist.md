# adapter-implementation-checklist

Final validation checklist for Prisma ORM v7 SQL driver adapters before release.

## Priority

CRITICAL

## Why It Matters

Driver adapters sit on the correctness boundary between Prisma and the database driver. Small contract mismatches in transaction lifecycle, type mapping, or error conversion can cause silent data bugs or broken Prisma features. Running this checklist before shipping reduces production regressions.

## Factory and Adapter Contract

- Implement `SqlMigrationAwareDriverAdapterFactory` with:
  - `provider`
  - `adapterName`
  - `connect()`
  - `connectToShadowDb()`
- Implement `SqlDriverAdapter` with:
  - `queryRaw()`
  - `executeRaw()`
  - `executeScript()`
  - `startTransaction()`
  - `dispose()`
  - `getConnectionInfo()` (optional)

## Transaction Lifecycle Rules

- Implement `Transaction` with:
  - `options`
  - `commit()`
  - `rollback()`
  - `queryRaw()`
  - `executeRaw()`
- Treat `commit()` and `rollback()` as lifecycle hooks only.
- Do not issue SQL in `commit()` or `rollback()`; Prisma sends transaction SQL through `executeRaw()`.
- Ensure nested transactions use savepoints for depth > 1.

## Data and Type Mapping

- Map all adapter argument values (`args`) using `argTypes`.
- Ensure row value conversion returns Prisma-compatible `ResultValue` types.
- Map database column metadata to `ColumnTypeEnum` accurately.
- Return `lastInsertId` as string when relevant.

## Error Mapping

- Wrap adapter errors in `DriverAdapterError`.
- Return structured `MappedError` kinds where possible.
- Preserve useful metadata (codes/messages) needed for Prisma error handling.

## Verification

- Unit tests:
  - `queryRaw`
  - `executeRaw`
  - `executeScript`
  - transaction start/commit/rollback behavior
- End-to-end tests with real `PrismaClient`:
  - CRUD
  - rollback on thrown error
  - nested transaction behavior

## References

- [Prisma Driver Adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers#driver-adapters)
- [Prisma Driver Adapter Utils Package](https://www.npmjs.com/package/@prisma/driver-adapter-utils)
