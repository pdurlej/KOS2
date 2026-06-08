# Contributing to KOS2

Thanks for considering a contribution to KOS2.

KOS2 is an Ollama-first Knowledge Operating System layer for Obsidian. It started as a soft fork of [logancyang/obsidian-copilot](https://github.com/logancyang/obsidian-copilot) and inherits its `AGPL-3.0` license, but the product direction is different — see [`docs/kos-philosophy.md`](docs/kos-philosophy.md) and [`docs/bmad/10-prd-kos2.md`](docs/bmad/10-prd-kos2.md) before opening larger PRs.

## Issues and Ideas

Issues live at [github.com/pdurlej/KOS2/issues](https://github.com/pdurlej/KOS2/issues). Before filing a new one, please check the existing list.

When reporting a bug:

- describe the exact steps to reproduce
- include your Obsidian version, OS, and the KOS2 version (visible in `Settings -> Community plugins`)
- attach screenshots or short clips when behaviour is visual
- if the bug is Ollama-related, include `ollama --version` and which models you have pulled

When suggesting an enhancement:

- frame the proposal against the KOS workflows (`organise`, `next steps`, `decision`, `review`) where possible
- be explicit about whether the work should stay fully local or whether it crosses into `Ollama Cloud` territory

## Multi-Agent Coordination

This repo may be edited by more than one coding agent (Codex, Claude Code) at the same time. Before making changes, read [`docs/agent-collaboration.md`](docs/agent-collaboration.md) and create a claim file under [`docs/agent-claims/`](docs/agent-claims/).

## Development Setup

KOS2 is a TypeScript Obsidian plugin. You will need:

- Node.js 18 or newer
- a local Ollama install with at least one chat model and one embedding model pulled
- a separate Obsidian vault used only for development

```bash
git clone https://github.com/pdurlej/KOS2.git
cd KOS2
npm install
```

Build the plugin once and copy the artifacts into your dev vault:

```bash
npm run build
mkdir -p "/path/to/YourDevVault/.obsidian/plugins/kos2"
cp main.js manifest.json styles.css "/path/to/YourDevVault/.obsidian/plugins/kos2/"
```

Reload Obsidian (or use the Obsidian CLI plugin reload command — see [`CLAUDE.md`](CLAUDE.md)) and enable `KOS2`.

For ongoing iteration, prefer running `npm run build` after each change rather than a watch process. Long-lived watchers tend to leave stale state in dev vaults; one explicit build per change keeps verification predictable.

### Quality gates

Before opening a PR:

```bash
npm run format
npm run lint
npm test -- --runInBand
npm run build
```

For changes that touch dependencies or release tooling, also run:

```bash
npm audit --omit=dev
```

## Branching and Commits

- never commit directly on `main`; use a scoped branch
  - `feat/<short-scope>` for new functionality
  - `fix/<short-scope>` for bug fixes
  - `docs/<short-scope>` for docs-only changes
  - agents follow their own prefixes documented in [`docs/agent-collaboration.md`](docs/agent-collaboration.md)
- keep commits focused; do not mix runtime, docs, dependency, and release changes in one broad commit
- commit messages use the form `<type>: <short concrete change>`, for example `fix: preserve staged trash mode in cleanup`

## Pull Requests

A good KOS2 PR:

- describes the user-visible change in one or two sentences
- links to the issue it resolves, if any
- includes screenshots or recordings for UI changes
- lists which manual checks were run (see below)
- is built against the latest `main`

## Testing

### Unit Tests

```bash
npm test -- --runInBand
```

Unit tests live next to their source files (`*.test.ts`). Mock the Obsidian API rather than touching `__mocks__/obsidian.js` directly unless your change is specifically about the mock.

### Integration Tests

```bash
npm run test:integration
```

The integration suite still contains some legacy provider-specific paths inherited from the upstream fork. KOS2's primary integration target is the local `Ollama` runtime — use `npm run smoke:ollama` for that path.

### KOS2 Smoke and Benchmark

```bash
npm run smoke:ollama
npm run benchmark:kos2
```

These scripts assume a local Ollama is reachable at `http://127.0.0.1:11434` and that the relevant chat and embedding models are pulled.

### Manual Testing Checklist

After any non-trivial change, run through the parts of the checklist that apply:

#### Setup and Doctor

- run `KOS2: Run Setup Check` and confirm the Doctor reflects what the local Ollama actually has
- toggle `Privacy (local) Mode` and confirm cloud paths disappear from the UI
- run `KOS2: Reset Setup State` on a clean install to verify onboarding still works

#### KOS Workflows

- with an active markdown note, run `Organise this note` from the `KOS starter`
- run `Next steps`, `Decision`, and `Review` against a realistic note and verify previews appear before any write
- confirm that no workflow silently writes to the vault — every write must be previewable

#### Chat and Vault QA

- ask a chat question that requires the active note as context
- ask a vault-wide question with `@vault` and confirm sources are listed
- pause and resume indexing, confirm progress is reflected in the UI

#### Settings and Models

- change chat model in `Knowledge` and confirm the next chat call uses it
- change embedding model and confirm the index rebuilds rather than silently mismatching
- run `Refresh Ollama Models` after pulling a new model and confirm it appears

#### Web Capabilities (only if you touched them)

- with `Ollama Cloud` configured, run a web-search-tagged query
- without `Ollama Cloud` configured, confirm the web tools are gracefully unavailable rather than failing loudly

## Code Style

See [`CLAUDE.md`](CLAUDE.md) for the active code-style rules — TypeScript strict mode, no `console.log`, JSDoc on public functions, Tailwind classes via the prefix configured in `tailwind.config.js`, generalisable solutions over hardcoded edge cases, no editing AI prompt content unless explicitly asked.

Two repository-specific reminders:

- never run `npm run dev`; this repo uses explicit `npm run build` runs to avoid stale watch state in dev vaults
- never commit `main.js` or `styles.css` — they are generated artifacts shipped via GitHub Releases / BRAT

## Getting Help

- file issues at [github.com/pdurlej/KOS2/issues](https://github.com/pdurlej/KOS2/issues)
- for questions about the KOS philosophy and product intent, read [`docs/kos-philosophy.md`](docs/kos-philosophy.md) first
- for current development context, the BMAD docs under [`docs/bmad/`](docs/bmad/) are the canonical reference

Thank you for contributing.
