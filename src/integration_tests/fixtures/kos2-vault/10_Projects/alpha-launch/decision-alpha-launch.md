---
tags:
  - decision
  - alpha
status: accepted
---

# Decision Alpha Launch

## Decision

KOS2 ships Alpha with:

- local Ollama as the default runtime,
- optional Ollama Cloud only for web tools,
- no custom backend,
- no early ingest or transcript scope.

## Evidence

- [[analysis-alpha-launch]]
- [[project-alpha-launch]]

## Consequences

- runtime and settings must stay local-first,
- web tools must fail clearly without blocking local flows,
- workflow contracts must be finalized before feature implementation.
