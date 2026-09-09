---
name: prisma-hol-guard
description: Protect state-changing Prisma workflows with HOL Guard on a supported local coding-agent harness. Use before Prisma migrations, database writes, destructive CLI actions, deployment changes, or other agent-driven Prisma operations where a guarded execution boundary is needed.
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# Prisma HOL Guard Safety

Use HOL Guard to protect a supported local coding-agent harness before the agent performs state-changing Prisma work.

HOL Guard runs at the local agent boundary. It does not run inside Prisma and does not replace Prisma authentication, project/database targeting, native confirmations, migration review, backups, RBAC, or Prisma's AI safety checks.

## When to Apply

Use this skill before agent-driven Prisma operations that can change data, schema, infrastructure, or deployment state, including:

- `prisma migrate dev`, `prisma migrate deploy`, `prisma migrate reset`, and `prisma migrate resolve`
- `prisma db push`, especially `--force-reset` or `--accept-data-loss`
- `prisma db execute` against a writable target
- Prisma Platform or Compute operations that create, update, deploy, or delete resources
- any workflow where an agent may turn generated commands into real Prisma-side effects

Read-only inspection and validation can still use Prisma's normal tooling directly when no protected mutation follows.

## Critical Prisma Consent Boundary

Prisma has its own explicit consent checks for dangerous AI-driven commands. Keep them authoritative.

- Never invent or synthesize `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`.
- Never treat a HOL Guard approval as Prisma user consent.
- If Prisma requires explicit consent, obtain it exactly as Prisma documents and only for the specific destructive action being attempted.
- Keep Prisma's own confirmations, environment checks, target verification, and recovery guidance in place.

HOL Guard is an additional execution boundary, not a bypass for Prisma's safeguards.

## Install HOL Guard

Install HOL Guard in the local environment that launches the coding agent:

```bash
pipx install hol-guard
```

Detect the supported local harness:

```bash
hol-guard detect --json
```

Use the harness identifier returned by detection. Do not guess or maintain a hard-coded adapter list.

Install protection for that harness:

```bash
hol-guard install <detected-harness>
```

Verify the protection state before doing Prisma-changing work:

```bash
hol-guard doctor
```

Launch the coding-agent session through HOL Guard:

```bash
hol-guard run <detected-harness>
```

Perform the Prisma workflow from that protected agent session.

## Protected Prisma Workflow

1. Confirm the intended Prisma project, database, environment, branch, and credentials before mutation.
2. Run `hol-guard detect --json`, install the detected harness if needed, and require `hol-guard doctor` to report a usable protected setup.
3. Start the agent with `hol-guard run <detected-harness>`.
4. Inspect the exact Prisma command or action before execution. Use Prisma's native preview, status, migration diff, backup, and branch workflows where applicable.
5. If HOL Guard blocks, requests review, errors, or is unavailable, do not bypass it by launching an unprotected agent or shell to perform the same mutation.
6. If Prisma itself requests explicit destructive-action consent, satisfy that Prisma requirement separately. Guard approval does not substitute for it.
7. After the operation, verify the actual Prisma target and resulting state with Prisma-native status, schema, migration, deployment, or audit surfaces.

## Fail-Closed Rules

Do not silently fall back to unprotected execution for a state-changing Prisma action.

Stop and repair the Guard setup when:

- `hol-guard detect --json` cannot identify a supported harness for the intended session
- `hol-guard install <detected-harness>` fails
- `hol-guard doctor` reports that required protection is unhealthy
- a Guard decision requires review or denies the attempted action
- the protected harness exits or cannot be started

Use Prisma's own recovery and rollback procedures for Prisma-side failures. HOL Guard does not replace database backups, migration rollback planning, or environment-specific disaster recovery.

## Inspection Is Not Enforcement

`hol-guard command test --json` can be useful for side-effect-free command inspection, but command inspection alone is not the same thing as running the coding agent through HOL Guard's protected harness boundary.

For state-changing Prisma work, use the protected harness workflow above.

## Example: Migration Deployment

Before an agent runs a production migration:

```bash
hol-guard detect --json
hol-guard install <detected-harness>
hol-guard doctor
hol-guard run <detected-harness>
```

Inside the protected session:

1. verify the target database and deployment environment
2. review migration status and the migration artifacts
3. execute the intended Prisma migration only after both Guard and Prisma requirements are satisfied
4. verify the resulting migration state with Prisma-native commands

Do not convert a blocked or review-required Guard decision into an unprotected `prisma migrate deploy` attempt.

## Relationship to Prisma Safety Controls

Keep these layers separate:

- **HOL Guard** protects the supported local coding-agent execution boundary.
- **Prisma CLI and Platform controls** remain authoritative for Prisma authentication, consent, targeting, validation, migrations, and resource operations.
- **Database controls** remain authoritative for database permissions, backups, replication, recovery, and audit.

Use all applicable layers together. Do not claim that HOL Guard is embedded in Prisma or intercepts server-side Prisma traffic.
