# Platform authentication and project context

## Priority

CRITICAL

## Authentication precedence

```bash
npx -y @prisma/cli@latest auth login
npx -y @prisma/cli@latest auth whoami --json
npx -y @prisma/cli@latest auth workspace list --json
npx -y @prisma/cli@latest auth workspace use <workspace-id-or-name>
npx -y @prisma/cli@latest auth workspace logout <workspace-id-or-name>
```

Multiple OAuth workspace sessions may coexist. The active workspace pointer selects one. Prefer the workspace id returned by JSON; names can be ambiguous. Logging out the active workspace does not authorize silently falling through to another one.

`PRISMA_SERVICE_TOKEN` is the non-interactive credential and takes precedence when non-empty. While it is set, normal commands use its workspace and `auth workspace use` cannot switch the OAuth context. Never print its value.

## Project commands

```bash
npx -y @prisma/cli@latest project list --json
npx -y @prisma/cli@latest project show --json
npx -y @prisma/cli@latest project create <name>
npx -y @prisma/cli@latest project link <project-id-or-name>
npx -y @prisma/cli@latest project rename <new-name>
npx -y @prisma/cli@latest project transfer <project-id>
```

Run each command's `--help` for its required project/workspace/confirmation options. Project linking writes local state under `.prisma/`; inspect the repository before replacing an existing link.

Project environment commands distinguish production, preview-template, and branch-specific values. Keep the same Git branch name across env, database, and Compute app operations. Do not echo values when listing or scripting env changes.

## Git and branches

```bash
npx -y @prisma/cli@latest git connect
npx -y @prisma/cli@latest git disconnect
npx -y @prisma/cli@latest branch list --json
```

The current CLI only lists platform branches. Branch creation/deletion exists in evolving API surfaces but is not a current CLI command. Do not fabricate it.
