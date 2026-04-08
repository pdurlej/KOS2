# KOS2 Discovery Context

## Project intent

KOS2 is the next evolution of `knowledge-operating-system`, but implemented as an Obsidian plugin instead of a command-only layer. The goal is to turn KOS workflows into a fast, vault-aware, interactive assistant with edit previews, document ingest, retrieval, and agent/tool orchestration inside Obsidian.

## Non-negotiable decisions

- Product name: `KOS2`
- Host platform target: Obsidian community plugin
- Fork strategy: soft fork from `obsidian-copilot`
- Primary runtime: `TypeScript plugin shell`
- Performance strategy: optimize model/runtime/ingest/retrieval first, not language purity
- Model strategy: `Ollama only`
- Supported Ollama paths:
  - local/self-hosted Ollama
  - Ollama Cloud for web tools
- No proprietary KOS2 backend
- BYOK/self-host mindset

## Environment facts

- Machine: Apple Silicon (`M1 Max`, `arm64`)
- OS: macOS
- Local Ollama available and responding
- Verified local models:
  - `qwen3-coder:30b`
  - `SpeakLeash/bielik-7b-instruct-v0.1-gguf:Q5_K_M`
  - `bge-m3:latest`
  - `gpt-oss:latest`
- Verified local capabilities:
  - chat
  - embeddings
- Verified cloud capability:
  - Ollama Cloud `web_search`

## Architectural direction

- Keep the Obsidian plugin runtime in TypeScript because Obsidian expects `main.js`, `manifest.json`, and `styles.css`.
- Treat Rust as an optional future acceleration layer for heavy local ingestion/indexing only if profiling proves it matters.
- Preserve useful upstream UI and orchestration where it saves time:
  - chat UI
  - tool surface
  - edit/apply preview
  - vault retrieval/search plumbing
- Remove or isolate upstream product lock-in:
  - Brevilabs API dependency
  - license/subscription logic
  - premium gating semantics

## Current bootstrap gaps

- PDF parsing is not yet implemented in the bootstrap path.
- EPUB / Office / rich document parsing is not yet implemented in the bootstrap path.
- YouTube transcript path still needs a dedicated provider decision for KOS2.
- UI still contains some upstream naming and structural leftovers outside the main bootstrap surface.

## Success criteria for the BMAD implementation phase

- Installable local plugin in Obsidian
- Local Ollama chat and embeddings working out of the box
- Ollama Cloud web search and URL fetch integrated for agent tools
- KOS-native workflows exposed as commands/tools
- Safe file edit preview before write
- Fast enough default experience on Apple Silicon with local models
