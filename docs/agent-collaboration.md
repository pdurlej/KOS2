# Multi-Agent Collaboration Policy

This repo may be worked on by multiple coding agents at the same time. Treat this file as the coordination contract between Codex, Claude Code, and any future agent.

## Core Rule

Do not start editing until you have checked the current Git state and declared your intended work area.

Every agent must avoid broad, cross-cutting changes unless explicitly assigned as the integrator for that session.

## Start-of-Session Checklist

Run these before making changes:

```bash
git status --short
git branch --show-current
git pull --ff-only
```

If the branch is `main`, create a scoped branch before editing:

```bash
git switch -c <agent>/<short-scope>
```

Use prefixes:

- `codex/<short-scope>` for Codex.
- `claude/<short-scope>` for Claude Code.
- `hotfix/<short-scope>` only when the user explicitly asks for a direct hotfix branch.

## Work Claims

Before editing, create a claim file under `docs/agent-claims/`.

Filename:

```text
docs/agent-claims/<agent>-<scope>.md
```

Minimum content:

```text
# <Agent> Claim: <Scope>

- Agent: Codex | Claude | other
- Branch: <branch-name>
- Started: YYYY-MM-DD HH:mm TZ
- Status: active | paused | ready-for-review | merged | abandoned
- Owned paths:
  - src/example/**
  - docs/example.md
- Non-owned paths to avoid:
  - <optional>
- Current intent:
  - <one or two concrete bullets>
- Verification plan:
  - <commands or manual checks>
```

Keep claims small and scoped. Prefer separate claim files over one shared worklog to reduce merge conflicts.

## Ownership Rules

- Do not edit files listed in another active claim unless the user explicitly assigns you integration ownership.
- If you must touch an actively claimed file, add a note to your claim explaining why and keep the diff minimal.
- Do not format the whole repo unless formatting is the assigned task.
- Do not mix unrelated work in one commit. Keep docs, runtime, CI, dependency, and UX changes separate when possible.
- Never revert another agent's work unless the user explicitly requests it.
- Never force-push another agent's branch.

## Recommended Ownership Split For The Current Audit Backlog

Safe parallel split:

- Codex: cleanup reliability hotfixes and tests.
  - Suggested owned paths: `src/kos/cleanup/**`, cleanup tests, focused changelog entry.
- Claude: docs, product audit, dependency/security audit plan.
  - Suggested owned paths: `docs/**`, `README.md`, `package.json`/`package-lock.json` only if explicitly working on dependency remediation.
- Shared later as a separate integration task: Doctor readiness, release workflow, public release notes.

If both agents need `package.json`, `package-lock.json`, `CHANGELOG.md`, or settings model files, appoint one integrator first.

## Commit And Push Rules

Before committing:

```bash
git status --short
git diff --stat
```

Run the lightest relevant verification:

- Unit-only change: targeted `npm test -- --runInBand <test files>`.
- Runtime or settings change: targeted tests plus `npm run lint`.
- Release or public branch change: `npm run lint`, `npm test -- --runInBand`, `npm run build`.
- Docs-only change: `npm run format:check` if Markdown files under `src` changed; otherwise inspect rendered Markdown manually.

Commit message format:

```text
<type>: <short concrete change>
```

Examples:

- `fix: preserve staged trash mode in cleanup`
- `docs: clarify local-first onboarding`
- `chore: update release workflow branch`

## Handoff Notes

At the end of a session, update your claim file:

- Set `Status`.
- List changed files.
- List verification commands and results.
- List known follow-ups or blockers.

If your branch is merged, leave the claim file as historical context unless the user asks to clean old claims.
