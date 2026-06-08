# Technical Debt

Living register of known debt in the KOS2 codebase. Update as items land or new debt is discovered.

_Last refreshed: 2026-06-08_

## 1. Cloud-zoo entanglement — RESOLVED

KOS2's product strategy is Ollama-first/Ollama-only ([PRD §3](../../docs/bmad/10-prd-kos2.md)). The cloud-zoo cleanup is complete.

- **Providers**: all ~14 cloud LLM providers removed (B-1…B-5). `AMAZON_BEDROCK` in `e920f03`; the rest across the `cleanup(B-*)` commit series. The `ChatModelProviders`/`EmbeddingModelProviders` enums now contain only `OLLAMA` and `OPENAI_COMPATIBLE` (the self-host escape hatch; renamed from `OPENAI_FORMAT` in B-8).
- **Brevilabs**: the cloud proxy had already been gutted to a local shim (url/web-fetch via `fetchUrlAsMarkdown`, web search via Ollama Cloud, doc/rerank local; no `api.brevilabs.com` calls). Renamed `BrevilabsClient` → `KOS2ToolsClient` and removed the dead license method + `BREVILABS_API_BASE_URL`.
- **Copilot Plus**: the paradigm was a no-op shim (`isPlusUser` never gated anything). Removed entirely (`isPlusEnabled`/`useIsPlusUser`/`checkIsPlusUser`, the `isPlusUser` field, `isPlusOnly` tool gate, `PLUS_UTM_MEDIUMS`, `CopilotPlusExpiredModal`). `plusUtils.ts` was renamed to `localRuntimeUtils.ts` — it is **kept** because it hosts the Ollama/self-host/transcript helpers used by 14 files.
- **Miyo**: **KEPT** — it is a _local_ self-hosted vector backend (defaults to `127.0.0.1:8742`, local service-discovery, opt-in via `enableMiyo`, clean fallback to the local v3/Orama index). The earlier "remove Miyo" label (B-7) was a misread; Miyo is on-strategy local infra.
- **Result**: `main.js` 5.3 MB → 3.4 MB. `grep -ri brevilabs src/` = 0; no `isPlusUser`/`checkIsPlusUser` remain.

## 2. Internal naming — mostly resolved

Renamed: `CopilotPlugin`→`KOS2Plugin`, `CopilotView`→`KOS2View`, `CopilotSettingTab`→`KOS2SettingTab`, `CopilotPlusChainRunner`→`KOS2AgentChainRunner`, `CopilotPlusModelAdapter`→`KOS2AgentModelAdapter`, `CopilotPlusWelcomeModal`→`OllamaWelcomeModal`, `CopilotPlusSettings`→`WorkflowsSettings`. `CHAT_VIEWTYPE` was already `"kos2-chat-view"`, so no workspace migration was needed.

- **Left intentionally**: the `CopilotSettings` type alias (pervasive legacy-internal type, no functional cost) and the `COPILOT_PLUS_CHAIN` `ChainType` member (its value is persisted in user settings — renaming would need a migration). Both are safe to leave; revisit only if a settings-schema migration is done for another reason.

## 3. Security findings — largely resolved

- `crypto-js` — **removed**. The MD5/SHA-256 cache-key uses were replaced with a zero-dependency FNV-1a hash (`src/utils/hash.ts`). API-key encryption was already on Web Crypto (`AES-GCM` + Electron `safeStorage`), so no change was needed there.
- `next-i18next` — **removed**. It was unused but transitively pulled the entire Next.js framework (~20 high-severity advisories) plus `i18next-fs-backend`. Also removed: `koa`, `koa-proxies`, `@koa/cors`, `@huggingface/inference`.
- **Remaining (accepted)**: `npm audit --omit=dev --audit-level=high` reports 4 transitive advisories — `langsmith` (via `langchain`), `minimatch`/`picomatch` (deep transitive), `svgo` (build-time via `esbuild-plugin-svg`). These are not reachable in a local Obsidian plugin's threat model (ReDoS needs attacker-controlled glob input; SVGO Billion-Laughs is build-time; langsmith tracing is off by default). Accepted rather than force-bumped, since pinning transitive deps risks runtime breakage in an archived project.
- `sse: github:mpetazzoni/sse.js` — still a git-only dependency (no npm provenance). Left for now; `eventsource-parser` is available as a replacement if revisited.

## 4. Long files (review/refactor candidates)

Decomposition is **deferred** until the Ollama-only cleanup lands. After cleanup these files will be much shorter — measure first, refactor second.

| file                                                                                                                             | lines | likely shrink after cloud cleanup                         |
| -------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------- |
| [`src/utils.ts`](../../src/utils.ts)                                                                                             | 1532  | medium — `checkModelApiKey()` and provider tables go away |
| [`src/components/modals/project/context-manage-modal.tsx`](../../src/components/modals/project/context-manage-modal.tsx)         | 1384  | small — UI not provider-coupled                           |
| [`src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts`](../../src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts)         | 1219  | rename + small shrink                                     |
| [`src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts`](../../src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts) | 1123  | small                                                     |
| [`src/contextProcessor.ts`](../../src/contextProcessor.ts)                                                                       | 1070  | small                                                     |
| [`src/components/Chat.tsx`](../../src/components/Chat.tsx)                                                                       | 1029  | small                                                     |
| [`src/components/chat-components/ChatSingleMessage.tsx`](../../src/components/chat-components/ChatSingleMessage.tsx)             | 1012  | small                                                     |

## 5. Inline TODO/FIXME/HACK markers (36 occurrences as of 2026-05-06)

A representative slice — most are upstream signposts that stop applying once the corresponding cloud branches go away.

- [`src/chainFactory.ts:1`](../../src/chainFactory.ts) — `TODO(logan): This entire file is deprecated since we moved to direct chat model calls in chain runners`
- [`src/utils.ts:107`](../../src/utils.ts) — `TODO: Rewrite with app.vault.getAbstractFileByPath()`
- [`src/utils.ts:269,531`](../../src/utils.ts) — deprecated chain-validation helpers
- [`src/LLMProviders/chainManager.ts:43,80,106,207,224,237`](../../src/LLMProviders/chainManager.ts) — multiple "deprecated, chain runners now own this" markers
- [`src/LLMProviders/chainManager.ts:375`](../../src/LLMProviders/chainManager.ts) — `TODO: hack for o-series models, to be removed when langchainjs supports system prompt`
- [`src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts:955,960`](../../src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts) — `TODO: remove this hack until better solution in place`
- [`src/components/quick-ask/QuickAskPanel.tsx:23,46,83,87,353`](../../src/components/quick-ask/QuickAskPanel.tsx) — `TODO: Uncomment when Edit/Edit-Direct modes are implemented`
- [`src/system-prompts/SystemPromptAddModal.tsx:18,93,156`](../../src/system-prompts/SystemPromptAddModal.tsx) — `TODO(emt-lin): May be used in the future`
- [`src/components/modals/CustomPatternInputModal.tsx:14`](../../src/components/modals/CustomPatternInputModal.tsx) — `TODO: Add validation`
- [`src/core/ChatManager.ts:294`](../../src/core/ChatManager.ts) — temporary token-budget hard cap

Action: clean the markers up as the corresponding code changes land. Do not file new tickets just to file them.

## 6. Stale design docs

[`designdocs/`](../) contains long-form upstream design notes that should be kept or pruned with intent:

- `MESSAGE_ARCHITECTURE.md` (33 KB) — actively referenced by `CLAUDE.md` and `AGENTS.md`; **keep**.
- `CONTEXT_ENGINEERING.md` (23 KB) — referenced by Message Architecture; **keep**.
- `OBSIDIAN_CLI_INTEGRATION.md` (35 KB) — describes upstream Obsidian CLI integration; KOS2 references the CLI in `CLAUDE.md`; **keep until KOS2-native CLI integration lands**, then prune.
- `TOOLS.md` (13 KB) — review for accuracy after Phase B-6 (Brevilabs removal); cloud tool descriptions will be stale.
- `CITATION_IMPLEMENTATION.md` (4 KB) — small, **keep**.
- `BEDROCK_TOOL_CALLING.md` — already deleted in `55a42be`.

[`designdocs/todo/`](.) inbox:

- `ACP_DESIGN.md` (23 KB) — upstream agent-control-protocol; review when KOS2's agent loop is finalised.
- `AGENT_PLANNING_REFLECTION_V0.md` (8 KB) — speculative; either land or delete.
- `AGENT_REASONING_BLOCK.md` (16 KB) — reflects current chain-runner shape; actively referenced; **keep**.
- `TODO-composer-tool-redesign.md` (4 KB) — referenced from `AgentReasoningState.ts:271`; **keep until composer redesign ships**.
- `TOKEN_BUDGET_ENFORCEMENT.md` (15 KB) — referenced from `ChatManager.ts`; **keep**.
- `UI_RENDERING_PERFORMANCE.md` (19 KB) — review for currency.

## 7. Public docs in `docs/`

- `docs/copilot-plus-and-self-host.md` — **rewritten** to "Cloud and Legacy Integrations"; reflects the Ollama-first reality (Plus framing dropped, self-host transcript/web-search paths described). Filename is stale but content is accurate; rename only if the index links are updated in lockstep.
- `docs/llm-providers.md`, `docs/models-and-parameters.md` — **rewritten** for Ollama-first.
- `docs/miyo-api.md` — **kept** (Miyo is local self-host infra, not a removed cloud surface).
- `docs/projects.md`, `docs/system-prompts.md` — review after the KOS2 project/prompt models stabilise.

## 8. Local agent definitions in `.claude/agents/`

- `.claude/agents/release.md` — describes the upstream "Copilot for Obsidian" release flow against `master` with semver. KOS2 ships from `main` with `YY.MM.X`. Refreshed in `claude/docs-and-cleanup`.
- `.claude/agents/code-reviewer.md`, `.claude/agents/pr-pricing.md` — review for KOS2 fit.

## 9. CI gates

- `npm audit` — added 2026-05-06 as fail-soft; flip to fail-hard after Phase E.
- Bundle size budget — added 2026-05-06 at 6 MB ceiling; tighten to 3 MB target after Phase D.
- Markdown link check — added 2026-05-06 as fail-soft.
- **Missing**: dependency license check, OWASP dependency check, source-map upload, code coverage gate.

## 10. Versioning and release artefacts

- `versions.json` was trimmed to KOS2-only in `55a42be`.
- `RELEASES.md` was split (KOS2 → `CHANGELOG.md`, upstream → `docs/release/upstream-archive.md`) in the same commit.
- `manifest.json` `minAppVersion: 0.15.0` is unrealistically old. Confirm what current code actually requires (Web Viewer, multipart `requestUrl`, recent Obsidian APIs) and bump.

## 11. Resolved (kept for context)

- ~~Docs4LLM SSL Error in Projects Mode~~ — original `TECHDEBT.md` entry from 2025-07-18 about the upstream Brevilabs `/docs4llm` endpoint. **Resolved**: `docs4llm` now runs locally (`normalizeDocumentContent` in `KOS2ToolsClient`) with no network/SSL path. Binary Office formats (Word/PPTX/Excel) are intentionally unsupported; text/markdown/CSV/JSON/XML/HTML are handled locally.

## How to add to this list

Keep entries actionable. A debt entry should describe **what is wrong**, **why it matters**, and **what the path forward looks like** — even if the path is "ship Phase X first and reassess." Avoid filing entries for cosmetic preferences that have no concrete cost.
