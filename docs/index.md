# KOS2 Documentation

KOS2 is an Ollama-first Obsidian plugin built around note operations, not generic chat.

This docs index is intentionally lighter than the upstream Copilot docs. Start with the KOS2-specific material first, then only go deeper into legacy docs if you need implementation detail or migration context.

## Start Here

| Document                                                  | What it covers                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Getting Started](getting-started.md)                     | Install from source, first-run Ollama setup, and the fastest path to a working local setup |
| [KOS Philosophy](kos-philosophy.md)                       | Why KOS2 exists, how PARA fits in, and what `SI` adds on top                               |
| [Chat Interface](chat-interface.md)                       | How the chat surface works today, including startup paths and workflow prompts             |
| [Agent Mode and Tools](agent-mode-and-tools.md)           | What the KOS2 agent can actually do now, and what still requires explicit setup            |
| [Vault Search and Indexing](vault-search-and-indexing.md) | Local semantic search, indexing, and how knowledge retrieval works                         |
| [Custom Commands](custom-commands.md)                     | Reusable commands and how to shape KOS-specific prompt flows                               |

## Planning And Product Docs

| Document                                               | What it covers                                |
| ------------------------------------------------------ | --------------------------------------------- |
| [Discovery context](bmad/00-discovery-context.md)      | Initial audit and repo context                |
| [Soft fork audit](bmad/01-soft-fork-audit.md)          | Upstream inheritance and what changed in KOS2 |
| [PRD](bmad/10-prd-kos2.md)                             | Product intent and scope                      |
| [Architecture](bmad/11-architecture-kos2.md)           | Technical direction and major constraints     |
| [Epics and stories](bmad/12-epics-and-stories-kos2.md) | Roadmap decomposition                         |

## Legacy And Migration Docs

These documents still exist because parts of the codebase were inherited from `obsidian-copilot`, but they should not be treated as the primary product narrative for KOS2.

| Document                                                       | What it covers                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Cloud and Legacy Integrations](copilot-plus-and-self-host.md) | What remains from the old Plus/self-host model and how it maps to KOS2 today |
| [LLM Providers](llm-providers.md)                              | Upstream provider-oriented architecture reference                            |
| [Models and Parameters](models-and-parameters.md)              | Detailed model and tuning notes from the broader base plugin                 |
| [Projects](projects.md)                                        | Inherited projects/workspaces surface                                        |
| [System Prompts](system-prompts.md)                            | System prompt management and customization                                   |
| [Troubleshooting and FAQ](troubleshooting-and-faq.md)          | Useful implementation notes, some still written in legacy product language   |
