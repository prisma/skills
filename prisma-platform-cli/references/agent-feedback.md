# Platform agent commands and feedback

## Priority

MEDIUM

The Platform CLI can install, update, and inspect Prisma agent skills:

```bash
npx -y @prisma/cli@latest agent status
npx -y @prisma/cli@latest agent install --dry-run
npx -y @prisma/cli@latest agent install
npx -y @prisma/cli@latest agent update
```

Current filters/options include global installation, a specific agent, all detected agents, a specific skill, copy mode, and dry-run. Inspect `agent <command> --help` because the package is beta.

Before changing installations:

1. Run `agent status` and inspect existing skills.
2. Use `--dry-run` when available.
3. Avoid overwriting user-authored skill directories without explicit intent.

Report a crash or unresolved CLI failure with:

```bash
npx -y @prisma/cli@latest feedback "command failed: <first useful error line>"
npx -y @prisma/cli@latest feedback "<feedback>" --email user@example.com
```

Feedback is anonymous unless an email is provided and attaches CLI, Node.js, OS, and architecture metadata. Never include tokens, connection URLs, bucket keys, env values, or user data. When a JSON crash envelope provides a prefilled recovery/feedback command, inspect it for secrets and then use it verbatim.
