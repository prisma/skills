# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, OpenCode, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for AI coding agents working with Prisma ORM. Each skill is a self-contained package (SKILL.md + metadata.json) that extends agent capabilities for database development, query optimization, and best practices.

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case directory name
    SKILL.md              # Required: skill definition with frontmatter and content
    metadata.json         # Required: version and author info
```

There is no `rules/` directory. All skill content lives in `SKILL.md`.

### Naming Conventions

- **Skill directory**: `kebab-case`, prefixed with `prisma-` (e.g., `prisma-cli-init`, `prisma-client-api-transactions`)
- **SKILL.md**: Always uppercase, always this exact filename

### SKILL.md Format

```markdown
---
name: prisma-{skill-name}
description: {One sentence describing when to use this skill. Include trigger phrases.}
license: MIT
metadata:
  author: prisma
  version: "1.0.0"
---

# {Skill Title}

{Content: explanation, code examples, options, and references.}
```

- **name**: Lowercase with hyphens only; must match the skill directory name.
- **description**: At least 20 characters; include trigger phrases so the agent knows when to load this skill.
- **Body**: Full guidance (commands, API usage, examples, links). Keep under 500 lines when possible.

### metadata.json Format

```json
{
  "name": "prisma-{skill-name}",
  "version": "1.0.0",
  "author": "prisma",
  "license": "MIT"
}
```

## Best Practices for Context Efficiency

Skills are loaded on-demand — only the skill name and description are loaded at startup. The full `SKILL.md` loads into context only when the agent decides the skill is relevant.

- **Write specific descriptions** — helps the agent know exactly when to activate the skill
- **Include trigger phrases** — explicit phrases like "prisma migrate dev", "transactions", "driver adapter"
- **Keep each skill focused** — one command, one API area, or one setup topic per skill

## Skill Writing Guidelines

### Code Examples

- Use realistic, production-like code examples
- Show the minimum code needed to illustrate the point
- Use TypeScript for Prisma Client examples
- Use Prisma Schema Language for schema examples
- Include proper syntax highlighting (```prisma, ```typescript)

### Prisma-Specific Conventions

- Always use the latest Prisma syntax and features
- Reference official Prisma documentation
- Consider both PostgreSQL and MySQL where behavior differs
- Note when content is database-specific

## Testing Skills Locally

To test a skill before committing:

1. Install the skill locally:
   ```bash
   cp -r skills/prisma-{skill-name} ~/.claude/skills/
   # or for OpenCode
   cp -r skills/prisma-{skill-name} ~/.config/opencode/skill/
   ```

2. Start a new agent session and trigger the skill

3. Verify the agent applies the skill correctly

## End-User Installation

Document these installation methods for users:

**Via add-skill CLI:**
```bash
npx add-skill prisma/skills
```

**Manual (Claude Code):**
```bash
cp -r skills/prisma-{skill-name} ~/.claude/skills/
```

**Manual (OpenCode):**
```bash
cp -r skills/prisma-{skill-name} ~/.config/opencode/skill/
```
