# KOS2

KOS2 is an Ollama-first soft fork of `obsidian-copilot`, rebuilt around the KOS workflow instead of a generic multi-provider AI assistant.

Current repository status:

- fork base preserved with upstream history
- plugin rebranded to `KOS2`
- default runtime moved toward `Ollama local`
- cloud web search path moved toward `Ollama Cloud`
- repo prepared for BMAD planning artifacts

## What KOS2 is for

KOS2 is intended to become the Obsidian-native execution layer for KOS:

- vault-aware chat and retrieval
- KOS command and artifact workflows
- local-first inference and embeddings through Ollama
- cloud-only web tooling where local models are not the right tool
- strict avoidance of SaaS lock-in for core note and retrieval paths

## Bootstrap direction

The current bootstrap milestone is not a finished product. It establishes:

- the repository and plugin identity
- Ollama-first defaults
- the first cloud web-search integration path
- BMAD-ready planning inputs

Planned work remains for:

- full KOS command UX
- local PDF / EPUB / doc ingestion
- YouTube transcript pipeline
- cleanup of remaining legacy `Copilot Plus` naming in the UI
- provider pruning and architectural hardening

## Local smoke checks

Run:

```bash
npm run smoke:ollama
```

The smoke script checks:

- local Ollama model discovery
- local chat inference
- local embeddings
- Ollama Cloud web search

It reads the cloud key in this order:

1. `OLLAMA_API_KEY`
2. macOS Keychain item `cos2-ollama-cloud`

## BMAD planning inputs

Planning inputs live in:

- [docs/bmad/00-discovery-context.md](/Users/pd/Developer/KOS2/docs/bmad/00-discovery-context.md)
- [docs/bmad/01-soft-fork-audit.md](/Users/pd/Developer/KOS2/docs/bmad/01-soft-fork-audit.md)
- [docs/bmad/02-capability-map.md](/Users/pd/Developer/KOS2/docs/bmad/02-capability-map.md)
- [docs/bmad/03-planning-entry.md](/Users/pd/Developer/KOS2/docs/bmad/03-planning-entry.md)

## Attribution

This repository starts from `logancyang/obsidian-copilot` and keeps its AGPL-3.0 obligations. KOS2 is a soft fork, not a claim that the original project authored this direction.
