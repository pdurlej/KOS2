# KOS2 Soft Fork Audit

## Upstream base

Base project: `obsidian-copilot`

## Keep and adapt

- Plugin bootstrapping and Obsidian integration
- Chat view and composer/apply UI
- Tool registration and tool execution flow
- Vault search and indexing scaffolding
- Project context scaffolding
- Settings architecture and model registry plumbing

## Remove or neutralize

- Brevilabs product dependency
- License validation as product gating
- Copilot Plus commercial semantics
- Default remote-first model assumptions

## Replace

- Default chat model:
  - from OpenRouter/Gemini
  - to local Ollama `qwen3-coder:30b`
- Default embedding model:
  - from remote embeddings
  - to local Ollama `bge-m3:latest`
- Web search:
  - from Brevilabs/self-host paid flow
  - to Ollama Cloud `web_search`
- URL processing:
  - from Brevilabs URL service
  - to direct fetch + HTML-to-Markdown
- Self-host auth assumptions:
  - from plus license key
  - to explicit self-host API key / local service config

## Bootstrap compatibility adapter

The class name `BrevilabsClient` is intentionally preserved in the bootstrap to avoid a large immediate rewrite. It now acts as a compatibility adapter for KOS2 runtime paths and should be renamed in a later BMAD implementation pass when the dependency graph is cleaned up.

## Coexistence decisions

- Plugin id changed to `kos2`
- Plugin name changed to `KOS2`
- Internal storage root changed to `kos2`
- Chat view type changed to `kos2-chat-view`

## Technical debt intentionally carried forward

- Internal file/class naming still includes `copilot`/`plus` in many places
- Some settings tabs still reflect upstream structure
- Unsupported ingest paths currently fail explicitly instead of silently degrading

## Why this is acceptable

This repository is being prepared for BMAD artifacts and implementation planning, not for a fully polished public release in one bootstrap pass. The objective is to preserve momentum and avoid a greenfield rewrite before the product/architecture/docs are locked down.
