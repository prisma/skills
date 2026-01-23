# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

See [AGENTS.md](./AGENTS.md) for complete documentation on repository structure, skill creation guidelines, and contribution instructions. The guidance in AGENTS.md applies to all AI coding agents including Claude Code.

## Quick Reference

- Skills are in `skills/{skill-name}/` directories
- Each skill has `SKILL.md` (required), `rules/` directory, and `metadata.json`
- Rule files follow `{category}-{rule-name}.md` naming
- Use `prisma-` prefix for all skill names
- Keep SKILL.md under 500 lines, put details in rule files
