# Changelog

All notable changes to KOS2 will be tracked in this file.

KOS2 uses the `YY.MM.X` versioning scheme:

- `YY` — last two digits of the year (e.g. `26` for 2026)
- `MM` — month number, no leading zero (e.g. `4` for April)
- `X` — release counter inside that month, starting at `1`

Example: `26.4.8` is the eighth release shipped in April 2026. The first KOS2 release on this scheme was `26.4.1`; the upstream history that predates it lives in [`docs/release/upstream-archive.md`](docs/release/upstream-archive.md).

## 26.6.1 - 2026-06-08

### Ollama-only refactor

- removed all remaining cloud LLM providers; chat and embedding providers are now only `Ollama` (local) and `OpenAI-compatible` (for local self-hosted endpoints)
- removed the `Copilot Plus` subscription paradigm entirely — every feature is available without any license or paywall
- renamed the misleading `BrevilabsClient` to `KOS2ToolsClient`; it was already a local shim (URL/web fetch, Ollama Cloud web search, local document handling) with no `api.brevilabs.com` calls
- kept the local Miyo self-hosted vector backend and the optional self-host web-search / transcript integrations

### Internal rebrand

- renamed the chat view, agent chain runner, settings tab, and onboarding/settings surfaces from `Copilot*`/`CopilotPlus*` to `KOS2*`/`Ollama*` equivalents
- no migration needed — the chat view type was already `kos2-chat-view`

### Dependencies, bundle, and security

- removed `crypto-js` (cache hashing moved to a zero-dependency FNV-1a hash; API-key encryption already used Web Crypto)
- removed `next-i18next` (unused, but it transitively pulled the entire Next.js framework and ~20 high-severity advisories) plus `koa`, `koa-proxies`, `@koa/cors`, and `@huggingface/inference`
- declared the previously-undeclared `@langchain/classic` dependency
- `main.js` reduced from 5.3 MB to ~3.0 MB

### Notes

- binary Office document parsing (Word / PowerPoint / Excel) is intentionally unsupported; text, Markdown, CSV, JSON, XML, and HTML are handled locally

## 26.4.8 - 2026-04-24

### Desktop UX simplification

- made the KOS starter lead with `Organise this note` as the primary first-success action
- added a compact readiness strip for active note, local model, privacy mode, and knowledge state
- simplified Knowledge copy around `Installed in Ollama`, `Verified for chat`, `Verified for embeddings`, and `Recommended`
- moved advanced model tables and agent tool controls behind expandable advanced sections

### Model and workflow clarity

- model recommendations now point users toward copyable pull commands and an explicit rescan
- Workflows now presents deterministic KOS paths before advanced agent tooling
- copy now treats embeddings and Ollama Cloud as optional follow-up capabilities instead of startup blockers

## 26.4.7 - 2026-04-24

### Onboarding reliability hotfix

- removed automatic Ollama discovery sync from plugin startup
- changed onboarding and settings checks to manual-first actions so KOS2 does not probe Ollama when Obsidian starts
- added `KOS2 Doctor`, a manual setup checklist for plugin load, settings, Ollama reachability, local chat models, local embeddings, semantic indexing, cloud key state, and diagnostics logs

### Recovery commands

- added `KOS2: Run Setup Check`
- added `KOS2: Open Diagnostics Log`
- added `KOS2: Reset Setup State`
- added `KOS2: Disable Advanced Features`
- added diagnostic setup-check state that records the last manual setup result without becoming runtime source of truth

## 26.4.6 - 2026-04-16

### Cleanup inbox workflow

- added a new `cleanup` workflow and command: `KOS Workflow: Cleanup 01 Inbox`
- cleanup now scans `01 Inbox`, discovers existing PARA destinations, groups likely duplicates, and builds a proposal-first action plan instead of mutating files silently
- cleanup proposal runs in its own dedicated modal with per-item skip, destination override, delete-mode flip, dry-run, and grouped review sections

### Safe execution model

- cleanup execution now stages most removals into `40 Archive/_trash/YYYY-MM-DD` instead of hard-deleting by default
- added preflight collision checks, shared asset detection, cleanup logs in `99 System/cleanup-logs`, and empty-folder pruning under `01 Inbox`
- added safe markdown relative-link repair after moves for deterministic cases only; unresolved links stay warnings rather than silent rewrites

### Cleanup v2 controls

- added settings-backed cleanup folder mapping for inbox, projects, areas, resources, archive, and trash roots
- added a user-managed learned-rules store for recurring cleanup routing without mutating prompts or source files
- richer cleanup classification now reuses KOS note heuristics, HTML clipping detection, and converted PDF previews when they already exist locally

## 26.4.3 - 2026-04-12

### Reliability hotfix

- `KOS starter` cards now launch the deterministic `organise`, `next-steps`, `decision`, and `review` workflows instead of injecting agent prompts into chat
- starter workflows now require an active markdown note and make that requirement explicit in the UI
- structured tool timeout classification now distinguishes `timeout` from other tool failures
- the autonomous agent now hard-stops after `readNote` or `localSearch` time out, and returns a protective refusal instead of improvising unsupported analysis

### Release focus

- restore trust in `KOS starter` as a workflow surface
- prevent hallucinated next steps or evidence summaries after vault evidence tools fail

## 26.4.2 - 2026-04-09

### Planned release line

- first release line independent from inherited `obsidian-copilot` numbering
- start using `26.4.x` format for April 2026 releases

### Current working baseline

- stronger `organise` ingest with intake signals, ranked routes, and stabilised artifact previews
- clearer `Ollama Local` / `Ollama Cloud` split with `Privacy (local) Mode`
- `KOS2 Local Agent` for default local-first operation
- simplified desktop setup, knowledge, and workflow UX
- updated public docs, philosophy, and repo landing assets
- fixed release-line CI lint failure caused by invalid Tailwind accent border class names

### Release follow-up

- verify install flow from GitHub release artifacts on a clean vault
- complete manual acceptance on local embeddings visibility after refresh
- prepare Obsidian Community Plugins submission materials

## 3.2.6 - 2026-04-09

### Highlights

- KOS2 positioned as an open, local-first Knowledge Operating System for Obsidian
- stronger `organise` flow with ranked routes and draft artifact preview
- local/cloud privacy split hardened around Ollama
- desktop UX pass across setup, knowledge, workflows, and starter surfaces
- public README and philosophy docs rebuilt around KOS rather than legacy Copilot framing
