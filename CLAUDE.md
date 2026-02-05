# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

See [AGENTS.md](./AGENTS.md) for complete documentation on repository structure, skill creation guidelines, and contribution instructions. The guidance in AGENTS.md applies to all AI coding agents including Claude Code.

## Quick Reference

- Skills are in `skills/{skill-name}/` directories
- Each skill has `SKILL.md` (required) and `metadata.json` — no `rules/` directory
- Use `prisma-` prefix for all skill names
- Skill names are granular (e.g. `prisma-cli-init`, `prisma-client-api-transactions`)
