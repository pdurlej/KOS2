# KOS2 Documentation

KOS2 is an Ollama-first Obsidian plugin built around note operations, not generic chat.

This docs index is intentionally lighter than the upstream Copilot docs. Start with the KOS2-specific material first, then only go deeper into legacy docs if you need implementation detail or migration context.

## Start Here

| Document                                                  | What it covers                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Getting Started](getting-started.md)                     | BRAT-first install, first-run Ollama setup, and the fastest path to a working local setup |
| [KOS Philosophy](kos-philosophy.md)                       | Why KOS2 exists, how PARA fits in, and what `SI` adds on top                              |
| [Chat Interface](chat-interface.md)                       | How the chat surface works today, including startup paths and workflow prompts            |
| [Agent Mode and Tools](agent-mode-and-tools.md)           | What the KOS2 agent can actually do now, and what still requires explicit setup           |
| [Vault Search and Indexing](vault-search-and-indexing.md) | Local semantic search, indexing, and how knowledge retrieval works                        |
| [Custom Commands](custom-commands.md)                     | Reusable commands and how to shape KOS-specific prompt flows                              |
| [Troubleshooting and FAQ](troubleshooting-and-faq.md)     | KOS2-first fixes for local Ollama, embeddings, privacy mode, and install issues           |

## Planning And Product Docs

| Document                                                            | What it covers                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [PRD](bmad/10-prd-kos2.md)                                          | Product intent and scope                                         |
| [Architecture](bmad/11-architecture-kos2.md)                        | Technical direction and major constraints                        |
| [Epics and stories](bmad/12-epics-and-stories-kos2.md)              | Roadmap decomposition                                            |
| [Test strategy](bmad/13-test-strategy-kos2.md)                      | Runtime, smoke, integration, and benchmark gates                 |
| [Workflow contracts](bmad/17-workflow-contracts-kos2.md)            | Current contracts for organise, next-steps, decision, and review |
| [Release QA checklist](bmad/18-manual-acceptance-checklist-kos2.md) | Current manual acceptance for the release line                   |

## BMAD Archive

| Document                               | What it covers                                       |
| -------------------------------------- | ---------------------------------------------------- |
| [BMAD Archive](bmad/archive/README.md) | Historical planning snapshots and early fork context |

## Legacy And Migration Docs

These documents still exist because parts of the codebase were inherited from `obsidian-copilot`, but they should not be treated as the primary product narrative for KOS2.

| Document                                                       | What it covers                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Cloud and Legacy Integrations](copilot-plus-and-self-host.md) | What remains from the old Plus/self-host model and how it maps to KOS2 today |
| [LLM Providers](llm-providers.md)                              | Upstream provider-oriented architecture reference                            |
| [Models and Parameters](models-and-parameters.md)              | Detailed model and tuning notes from the broader base plugin                 |
| [Projects](projects.md)                                        | Inherited projects/workspaces surface                                        |
| [System Prompts](system-prompts.md)                            | System prompt management and customization                                   |
