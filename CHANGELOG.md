# Changelog

All notable changes to KOS2 will be tracked in this file.

The versioning line now follows `YY.MM.release-in-month`.

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
