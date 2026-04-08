# KOS2 Planning Entry

## Product framing

KOS2 should feel like a native KOS operating layer inside Obsidian, not a generic AI sidebar. The implementation should prioritize speed, local-first behavior, predictable edit control, and workflows that map directly to how KOS is supposed to operate.

## Planning assumptions

- Local Ollama is the default runtime for everyday work.
- Ollama Cloud is optional and reserved for web-facing tools.
- No custom backend should be introduced unless a later BMAD decision explicitly justifies it.
- Existing upstream code should be reused where it shortens delivery without compromising direction.

## BMAD deliverables expected next

- PRD:
  - user personas
  - top workflows
  - feature boundaries for V1 vs later
- Architecture:
  - provider layer
  - ingestion layer
  - retrieval/indexing layer
  - agent/tool orchestration
  - settings/security model
- Epics and stories:
  - KOS command surface
  - Ollama local provider hardening
  - Ollama Cloud web tooling
  - ingest pipeline
  - settings/UX cleanup
  - local test and packaging flow

## Implementation sequencing proposal

1. harden Ollama runtime and settings
2. define and implement KOS command surface
3. stabilize retrieval/indexing for KOS workflows
4. add URL/web tooling with citations
5. implement document ingest stack
6. integrate YouTube transcript flow
7. clean remaining upstream naming and UX debt

## Definition of done for the next major delivery

- User can install `KOS2` alongside the original plugin
- User can select a local Ollama model and chat immediately
- User can index the vault with local embeddings
- User can run at least one KOS-native workflow end-to-end
- User can invoke web search through Ollama Cloud tools
- User can review edits before write-back
