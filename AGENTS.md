# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, OpenCode, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for AI coding agents working with Prisma ORM. Skills are packaged instructions and rules that extend agent capabilities for database development, query optimization, and best practices.

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/           # kebab-case directory name
    SKILL.md              # Required: skill definition with frontmatter
    rules/                # Required: individual rule files
      _sections.md        # Category overview
      {category}-{rule}.md # Individual rules
    metadata.json         # Required: version and author info
```

### Naming Conventions

- **Skill directory**: `kebab-case`, prefixed with `prisma-` (e.g., `prisma-schema-best-practices`)
- **SKILL.md**: Always uppercase, always this exact filename
- **Rule files**: `{category}-{rule-name}.md` in kebab-case (e.g., `relations-explicit-names.md`)
- **Categories**: Use consistent prefixes matching the skill's category table

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

# Prisma {Skill Title}

{Brief description of what the skill covers.}

## When to Apply

{Bullet list of scenarios when this skill should be used}

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | {Category} | CRITICAL | `{prefix}-` |
| 2 | {Category} | HIGH | `{prefix}-` |
...

## Quick Reference

### 1. {Category} (CRITICAL)

- `{prefix}-{rule}` - Brief description
- `{prefix}-{rule}` - Brief description

### 2. {Category} (HIGH)
...

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/{prefix}-{rule}.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references
```

### Individual Rule File Format

```markdown
# {category}-{rule-name}

{One sentence summary of the rule.}

## Priority

{CRITICAL | HIGH | MEDIUM | LOW}

## Why It Matters

{2-3 sentences explaining the impact of this rule.}

## Bad

```prisma
{Incorrect code example}
```

{Brief explanation of why this is problematic}

## Good

```prisma
{Correct code example}
```

{Brief explanation of why this is better}

## References

- [Prisma Documentation Link](https://prisma.io/docs/...)
```

### metadata.json Format

```json
{
  "name": "prisma-{skill-name}",
  "version": "1.0.0",
  "author": "prisma",
  "license": "MIT",
  "categories": ["category1", "category2"],
  "ruleCount": 15
}
```

## Best Practices for Context Efficiency

Skills are loaded on-demand — only the skill name and description are loaded at startup. The full `SKILL.md` loads into context only when the agent decides the skill is relevant. To minimize context usage:

- **Keep SKILL.md under 500 lines** — put detailed explanations in rule files
- **Write specific descriptions** — helps the agent know exactly when to activate the skill
- **Use progressive disclosure** — reference rule files that get read only when needed
- **Include trigger phrases** — explicit phrases like "review my schema" in the description

## Rule Writing Guidelines

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
- Note when a rule is database-specific

### Priority Levels

- **CRITICAL**: Can cause data loss, security issues, or severe performance problems
- **HIGH**: Significant impact on maintainability, performance, or developer experience
- **MEDIUM**: Improves code quality but not essential
- **LOW**: Nice-to-have optimizations or style preferences

## Testing Skills Locally

To test a skill before committing:

1. Install the skill locally:
   ```bash
   cp -r skills/prisma-{skill-name} ~/.claude/skills/
   # or for OpenCode
   cp -r skills/prisma-{skill-name} ~/.config/opencode/skill/
   ```

2. Start a new agent session and trigger the skill

3. Verify the agent applies rules correctly

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
