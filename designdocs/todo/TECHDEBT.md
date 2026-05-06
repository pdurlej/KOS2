# Technical Debt

Living register of known debt in the KOS2 codebase. Update as items land or new debt is discovered.

_Last refreshed: 2026-05-06_

## 1. Cloud-zoo entanglement (highest impact)

KOS2's product strategy is Ollama-first/Ollama-only ([PRD §3](../../docs/bmad/10-prd-kos2.md)) but the runtime still ships ~14 cloud LLM providers, a Brevilabs cloud proxy, a Miyo cloud index, and a `Copilot Plus` subscription paradigm.

- **Status**: `AMAZON_BEDROCK` removed in `e920f03`.
- **Remaining**: `OPENROUTERAI`, `LM_STUDIO`, `GITHUB_COPILOT`, `OPENAI`, `AZURE_OPENAI`, `SILICONFLOW`, `OPENAI_FORMAT` (decision pending), `ANTHROPIC`, `GOOGLE`, `XAI`, `MISTRAL`, `GROQ`, `DEEPSEEK`, `COHEREAI`, `COPILOT_PLUS`, `Brevilabs`, `Miyo`, `plusUtils`.
- **Plan**: [`docs/cleanup/ollama-only-refactor-plan.md`](../../docs/cleanup/ollama-only-refactor-plan.md) lays out phase-by-phase removal with file lists, grep recipes, and risks.
- **Why now**: drives the bulk of `npm audit` highs/criticals, inflates `main.js` from <3 MB target to 5.3 MB, and creates cognitive load for every contributor.

## 2. Internal naming still says "Copilot"

The product is `KOS2`, but the plugin class, view, settings tab, and chain runners are still named `CopilotPlugin`, `CopilotView`, `CopilotSettingTab`, `CopilotPlusChainRunner`, etc. Folder defaults inside the vault use `copilot-conversations`, `copilot-custom-prompts`.

- **Plan**: see Phase C in [`docs/cleanup/ollama-only-refactor-plan.md`](../../docs/cleanup/ollama-only-refactor-plan.md).
- **Risk**: view-type strings and folder paths are user-visible — needs a one-shot migration on plugin load so existing vaults don't lose their workspace layout or saved chats.

## 3. Security findings

- `crypto-js@^4.1.1` — CVE-2023-46233 weak PRNG in AES path. Used in [`src/encryptionService.ts`](../../src/encryptionService.ts) to encrypt API keys. Replacement: Web Crypto `crypto.subtle` (Phase F in the cleanup plan).
- `sse: github:mpetazzoni/sse.js` — git-only dependency, no npm provenance, supply-chain risk. Replace with `eventsource-parser` (already in deps).
- `npm audit --omit=dev` reports 52 findings (3 critical, 29 high) as of 2026-05-06. Most clear after Phase B (cloud-zoo cleanup) since they are transitive via `@aws-sdk/*`, `@langchain/community`, etc.
- CI now runs `npm audit --omit=dev --audit-level=high` as fail-soft. Promote to fail-hard once Phase E lands.

## 4. Long files (review/refactor candidates)

Decomposition is **deferred** until the Ollama-only cleanup lands. After cleanup these files will be much shorter — measure first, refactor second.

| file | lines | likely shrink after cloud cleanup |
|---|---|---|
| [`src/utils.ts`](../../src/utils.ts) | 1532 | medium — `checkModelApiKey()` and provider tables go away |
| [`src/components/modals/project/context-manage-modal.tsx`](../../src/components/modals/project/context-manage-modal.tsx) | 1384 | small — UI not provider-coupled |
| [`src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts`](../../src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts) | 1219 | rename + small shrink |
| [`src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts`](../../src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts) | 1123 | small |
| [`src/contextProcessor.ts`](../../src/contextProcessor.ts) | 1070 | small |
| [`src/components/Chat.tsx`](../../src/components/Chat.tsx) | 1029 | small |
| [`src/components/chat-components/ChatSingleMessage.tsx`](../../src/components/chat-components/ChatSingleMessage.tsx) | 1012 | small |

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

## 7. Public docs in `docs/` that still describe upstream-only surfaces

- `docs/copilot-plus-and-self-host.md` — about Brevilabs Plus / self-host; delete with Phase B-6.
- `docs/llm-providers.md` — lists every cloud provider; delete or rewrite to "Ollama, Ollama Cloud" after Phase B.
- `docs/models-and-parameters.md` — same; rewrite.
- `docs/projects.md` — upstream Projects/Workspaces; review after KOS2 project model is stable.
- `docs/system-prompts.md` — overlaps with `SystemPromptManager`; review.
- `docs/miyo-api.md` — delete with Phase B-7.
- `docs/index.md` — has a "Legacy and Migration Docs" section that should shrink as the legacy docs above go away.

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

- ~~Docs4LLM SSL Error in Projects Mode~~ — original `TECHDEBT.md` entry from 2025-07-18 about the upstream Brevilabs `/docs4llm` endpoint. Becomes obsolete with Phase B-6 (Brevilabs removal). No action needed.

## How to add to this list

Keep entries actionable. A debt entry should describe **what is wrong**, **why it matters**, and **what the path forward looks like** — even if the path is "ship Phase X first and reassess." Avoid filing entries for cosmetic preferences that have no concrete cost.
