# /write-linear-ticket

## For VS Code + GitHub Copilot 

- Open packages/agent-skills/src/index.ts so Copilot has context
- Open Copilot Chat (Ctrl+Shift+I)
- Paste: /write-linear-ticket "Your ticket title here"
- Copilot will infer context from the title and create a Linear ticket

## For Claude Code 

- Run from repo root: /write-linear-ticket "Your ticket title here"
- Claude Code reads this SKILL.md automatically as the skill definition

### Quick test

```bash

	# Claude Code

	/write-linear-ticket "Fix login timeout"

	# Expected: creates ENG-XXX in Linear with inferred structured description

	# VS Code + Copilot

	# Open Copilot Chat → paste:

	/write-linear-ticket "Fix login timeout"

```

## Setup (required for both)

1. Create a Linear API key: Linear → Settings → Account → Security & Access → API Keys
	- Permission needed: Create issues only
	- Suggested name: {your-project}-turborepo-cli
2. Configure package-local env file:
	```bash
	cd packages/agent-skills
	cp .env.example .env.local
	```
	Then set `LINEAR_API_KEY` in `.env.local`
3. Find your teamId:
	curl -s -X POST -H "Content-Type: application/json" \
	  -H "Authorization: $LINEAR_API_KEY" \
	  --data '{"query": "query { teams { nodes { id name key } } }"}' \
	  https://api.linear.app/graphql
4. Update teamId in packages/agent-skills/src/index.ts with the id from above

## Troubleshooting

- "Missing API key" → add `LINEAR_API_KEY` to `packages/agent-skills/.env.local`
- "Entity not found: Team" → wrong teamId, re-run the curl above
- "command not found" → run: pnpm install from repo root

# /write-linear-ticket

Creates a Linear issue with Ashinaga-formatted context from the terminal.

## Command

```bash
pnpm --filter @ashinaga/agent-skills dev "<ticket title>"
```

## Examples

```bash
pnpm --filter @ashinaga/agent-skills dev "Fix login"
pnpm --filter @ashinaga/agent-skills dev "Scholar dashboard filtering is broken"
```

## Monorepo dev behavior

- Root `pnpm dev` runs this package `dev` task via Turborepo.
- If no ticket title is provided, this task exits successfully with a skip message.
- Ticket creation only runs when you intentionally provide a title argument.

## Required environment variables

- `LINEAR_API_KEY`

## Optional environment variables

- `LINEAR_TEAM_ID`
	- Defaults to: `863b168a-26c3-4c3d-9a7e-c229747ea402`

## What it sends to Linear

- Issue title from command argument
- Team UUID from `LINEAR_TEAM_ID` or default
- Description in this format:

```text
Ashinaga Context

* Branch: <current-branch>
* Workspace: ashinaga/packages/agent-skills
* Git changes: <top 3 git status entries>
* Created: YYYY-MM-DD HH:MM UTC

Task
<ticket title>

[Auto-generated: Ashinaga Turborepo skill]
```

Notes:
- `Git changes` is built from `git status --porcelain` (first 3 entries)
- Timestamp is UTC

## Output

On success, prints:

- Linear identifier (example: `ENG-123`)
- Linear issue URL
- Suggested branch name (example: `feature/eng-123-fix-login`)

## Quick test

```bash
pnpm --filter @ashinaga/agent-skills dev "Fix login"
```

Expected result: a new issue like `ENG-123` is created and URL is printed.
