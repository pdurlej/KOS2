# Ollama-only Refactor — Execution Plan

> **STATUS: COMPLETE (2026-06-08).** All phases below have landed on `claude/docs-and-cleanup`.
> End state: `ChatModelProviders`/`EmbeddingModelProviders` = `OLLAMA` + `OPENAI_COMPATIBLE` only;
> `grep -ri brevilabs src/` = 0; no `isPlusUser`/`checkIsPlusUser`; `crypto-js`/`next-i18next` removed;
> `main.js` 5.3 MB → 3.4 MB; tsc 0 errors; 113 suites / 1931 tests green.
>
> **Corrections to the original plan (discovered during execution):**
>
> - **Miyo is KEPT** (not removed). It is a _local_ self-hosted vector backend (`127.0.0.1:8742`,
>   service-discovery, opt-in `enableMiyo`, clean fallback to the local v3 index). The B-7 "remove" label was a misread.
> - **`selfHostServices.ts` is KEPT** (not deleted). It is the replacement layer for web search
>   (Firecrawl/Perplexity) and YouTube transcripts (Supadata) after Brevilabs.
> - **`plusUtils.ts` was renamed, not deleted** → `localRuntimeUtils.ts`. It hosts the Ollama/self-host/
>   transcript helpers used by 14 files. The Plus paradigm itself was a no-op shim and was stripped.
> - **Brevilabs was already a local shim**, not a live cloud proxy. It was renamed `BrevilabsClient` →
>   `KOS2ToolsClient` (working local tooling kept), not deleted. No `api.brevilabs.com` calls existed.
> - **`CopilotPlusWelcomeModal` is KEPT** (renamed `OllamaWelcomeModal`) — it is the live Ollama onboarding modal.
> - **Phase F became a no-op for encryption** — `encryptionService.ts` was already on Web Crypto;
>   the real `crypto-js` footprint was the cache-key hashes (→ FNV-1a).

This is an executable plan for finishing the Ollama-only refactor that the [Bedrock removal commit](https://github.com/pdurlej/KOS2/commit/HEAD) started. It is written so a follow-up agent (Sonnet / Haiku) can carry it out without re-discovering the structure of the codebase.

## Why this exists

[`docs/bmad/10-prd-kos2.md`](../bmad/10-prd-kos2.md) §3 says: **"provider strategy: tylko Ollama"**. The manifest description, README, and onboarding all promise Ollama-first. The codebase still ships ~14 cloud providers, a Brevilabs cloud proxy, a Miyo cloud index, and a `Copilot Plus` subscription paradigm. That mismatch:

- bloats the bundle (`main.js` ≈ 5.3 MB after Bedrock; ~5.5 MB before)
- ships ~50 transitive `npm audit` findings (most via `@aws-sdk/*` and `@langchain/community`)
- forces every contributor to reason about cloud paths the product does not advertise

The end state is: KOS2 ships only `Ollama` (local) and `Ollama Cloud` (web tools) provider paths. Everything else is removed from runtime, settings, UI, docs, and `package.json`.

## Status snapshot (after Bedrock removal commit `e920f03`)

Done:

- ✅ `AMAZON_BEDROCK` provider removed end-to-end (`src/LLMProviders/BedrockChatModel.ts`, enum, settings, UI, curl builder)
- ✅ `CONTRIBUTING.md` rebranded
- ✅ `RELEASES.md` / `versions.json` shrunk to KOS2 line
- ✅ `images/` pruned (-19 MB), `local_copilot.md` deleted
- ✅ `designdocs/BEDROCK_TOOL_CALLING.md` deleted

Remaining cloud surfaces (full list):

### Chat providers in `ChatModelProviders` enum (`src/constants.ts`)

| value            | runtime impact                                        | local?              |
| ---------------- | ----------------------------------------------------- | ------------------- |
| `OLLAMA`         | **keep**                                              | yes                 |
| `OPENROUTERAI`   | drop                                                  | no                  |
| `LM_STUDIO`      | drop (Ollama covers local)                            | local-but-redundant |
| `OPENAI`         | drop                                                  | no                  |
| `OPENAI_FORMAT`  | drop or keep as Ollama-compat? — see §"Open question" | mixed               |
| `ANTHROPIC`      | drop                                                  | no                  |
| `GOOGLE`         | drop                                                  | no                  |
| `XAI`            | drop                                                  | no                  |
| `AZURE_OPENAI`   | drop                                                  | no                  |
| `GROQ`           | drop                                                  | no                  |
| `COPILOT_PLUS`   | drop (Brevilabs proxy)                                | no                  |
| `MISTRAL`        | drop                                                  | no                  |
| `DEEPSEEK`       | drop                                                  | no                  |
| `COHEREAI`       | drop                                                  | no                  |
| `SILICONFLOW`    | drop                                                  | no                  |
| `GITHUB_COPILOT` | drop                                                  | no                  |

### Embedding providers in `EmbeddingModelProviders` enum

| value                                                                                                       | drop?            |
| ----------------------------------------------------------------------------------------------------------- | ---------------- |
| `OLLAMA`                                                                                                    | **keep**         |
| `OPENAI`, `COHEREAI`, `GOOGLE`, `AZURE_OPENAI`, `LM_STUDIO`, `OPENAI_FORMAT`, `SILICONFLOW`, `OPENROUTERAI` | drop             |
| `COPILOT_PLUS`, `COPILOT_PLUS_JINA`                                                                         | drop (Brevilabs) |

### Standalone modules to remove

| path                                                 | reason                                    |
| ---------------------------------------------------- | ----------------------------------------- |
| `src/LLMProviders/ChatOpenRouter.ts`                 | OpenRouter-only                           |
| `src/LLMProviders/ChatLMStudio.ts`                   | LM Studio-only (Ollama covers it)         |
| `src/LLMProviders/CustomJinaEmbeddings.ts`           | Brevilabs Jina embeddings                 |
| `src/LLMProviders/CustomOpenAIEmbeddings.ts`         | only consumed by cloud providers          |
| `src/LLMProviders/githubCopilot/**`                  | GitHub Copilot — its own folder, ~4 files |
| `src/LLMProviders/brevilabsClient.ts`                | Brevilabs cloud proxy backend             |
| `src/LLMProviders/selfHostServices.ts`               | upstream Plus self-host shim              |
| `src/miyo/**`                                        | Miyo cloud index client (5 files)         |
| `src/search/miyo/**`                                 | Miyo retriever and tests                  |
| `src/search/indexBackend/MiyoIndexBackend.ts`        | Miyo index backend                        |
| `src/plusUtils.ts` (+ test)                          | Plus subscription paradigm                |
| `src/components/modals/CopilotPlusWelcomeModal.tsx`  | upstream onboarding modal                 |
| `src/settings/v2/components/CopilotPlusSettings.tsx` | Plus settings tab                         |
| `src/settings/v2/components/GitHubCopilotAuth.tsx`   | GitHub Copilot OAuth UI                   |

### Cross-cutting touch-points

- `src/main.ts` — bootstrap, imports `BrevilabsClient`, `CopilotPlusWelcomeModal`, `checkIsPlusUser`
- `src/aiParams.ts` — `ModelConfig` and `CustomModel` carry cloud-only fields (openAIApiKey, anthropicApiKey, cohereApiKey, azureOpenAIApi\*, apiKey, openAIProxyBaseUrl, groqApiKey, mistralApiKey)
- `src/constants.ts` — enum, ProviderInfo, ProviderSettingsKeyMap, DEFAULT*SETTINGS, BREVILABS*\*\_BASE_URL
- `src/settings/model.ts` — settings interface (15+ cloud key fields)
- `src/settings/providerModels.ts` — per-provider model fetchers (~250 LOC of cloud-only response parsing)
- `src/settings/v2/components/ModelAddDialog.tsx`, `ModelEditDialog.tsx` — provider-specific UI sections
- `src/settings/v2/components/ApiKeyDialog.tsx` — every cloud key form
- `src/utils.ts` — `checkModelApiKey()` per-provider validation, ~70 LOC
- `src/utils/curlCommand.ts` — provider-specific curl builders (Anthropic, OpenAI-compat, Google, GitHub Copilot)
- `src/encryptionService.ts` — encryptAllKeys() iterates every cloud key field
- `src/LLMProviders/chatModelManager.ts` — `CHAT_PROVIDER_CONSTRUCTORS` map, `providerApiKeyMap`, `providerConfig` block (~200 LOC)
- `src/LLMProviders/embeddingManager.ts` — analogous structure
- `src/tools/FileParserManager.ts`, `src/tools/SearchTools.ts`, `src/cache/pdfCache.ts` — call into Brevilabs for PDF/web parsing
- `src/search/searchUtils.test.ts`, `src/search/hybridRetriever.ts`, `src/search/RetrieverFactory.ts`, `src/search/findRelevantNotes.ts`, `src/search/vectorStoreManager.ts` — Miyo branches
- `src/mentions/Mention.ts` — Brevilabs web search
- `src/components/ui/ModelParametersEditor.tsx` — provider-specific reasoning fields
- `src/utils/modelUtils.ts` — `requiresApiKey()` cloud table
- `src/LLMProviders/chainRunner/utils/ThinkBlockStreamer.ts` — OpenRouter reasoning channel (~50 LOC)
- `src/LLMProviders/chainRunner/utils/finishReasonDetector.ts` — generic, leave (used by Anthropic/Bedrock/etc. token usage detection — works regardless)

### Dependencies to drop in `package.json` after the refactor

```text
@google/generative-ai
@huggingface/inference
@langchain/anthropic
@langchain/cohere
@langchain/deepseek
@langchain/google-genai
@langchain/groq
@langchain/mistralai
@langchain/openai
@langchain/xai
cohere-ai
sse: github:mpetazzoni/sse.js   # supply-chain risk; replace with eventsource-parser (already installed)
```

Probably **keep**:

- `@langchain/core`, `@langchain/community`, `@langchain/ollama`, `@langchain/textsplitters`, `langchain`
- `@orama/orama`, `minisearch`, `fuzzysort`, `trie-search` — local search index
- `chrono-node`, `luxon` — date parsing
- React/Lexical/Radix UI/Tailwind — UI
- `axios` — confirm whether it is still used after Brevilabs removal; if not, drop too

### crypto-js replacement

`src/encryptionService.ts` uses `crypto-js` for AES of API keys. CVE-2023-46233 (weak PRNG). Replace with `crypto.subtle` (Web Crypto API, no dep). Plan in §"Phase F".

## Open question (decide before Phase B starts)

`OPENAI_FORMAT` (a.k.a. "OpenAI-compatible custom endpoint") is **not** the same as cloud OpenAI — it is the standard escape hatch users hit when they run their own self-hosted OpenAI-compatible inference (vLLM, llama.cpp server, etc.). Two reasonable options:

1. **Drop it together with the rest.** Pure Ollama-only. User who wants vLLM is told to put it behind Ollama or use Ollama's own `OPENAI_FORMAT`-equivalent endpoint.
2. **Keep `OPENAI_FORMAT` as a single "OpenAI-compatible" path** (no per-provider list, just `Ollama` and `OpenAI-compatible`). This preserves the local self-host escape hatch without dragging cloud SDK back in.

Recommendation: **Option 2**. Lower regret, doesn't conflict with PRD ("self-host/local services" appears in PRD §10), and `ChatOpenAI` is already in the bundle for this case (will go away with `@langchain/openai` only if we go Option 1).

The plan below assumes Option 2 unless the operator overrides.

## Execution phases

Each phase is one commit, one focused diff. **Order matters** — earlier phases unlock cleaner removals later.

### Phase B-1 — `OPENROUTERAI` (Reference: Bedrock removal `e920f03`)

**Why first**: well-isolated, the cleanest follow-up after Bedrock. Hits 14 files but mostly the same patterns.

**Files**:

- `src/LLMProviders/ChatOpenRouter.ts` → delete
- `src/LLMProviders/chatModelManager.ts` → drop import, `CHAT_PROVIDER_CONSTRUCTORS[OPENROUTERAI]`, `providerApiKeyMap[OPENROUTERAI]`, `providerConfig[OPENROUTERAI]` block
- `src/LLMProviders/embeddingManager.ts` → drop `EmbeddingModelProviders.OPENROUTERAI` constructor, apiKey, config
- `src/constants.ts` → drop `ChatModelProviders.OPENROUTERAI`, `EmbeddingModelProviders.OPENROUTERAI`, `ProviderInfo[OPENROUTERAI]`, `ProviderSettingsKeyMap.openrouterai`, `openRouterAiApiKey: ""` default
- `src/settings/model.ts` → drop `openRouterAiApiKey: string`
- `src/settings/providerModels.ts` → drop `OpenRouterAIModelResponse`, `OpenRouterAIModel`, response map entry, adapter
- `src/settings/v2/components/ModelEditDialog.tsx` → drop OpenRouter prompt-cache toggle (~lines 211–235)
- `src/settings/v2/components/ModelAddDialog.tsx` → defaultProvider must change away from OPENROUTERAI; remove OpenRouter display-name examples
- `src/utils.ts` → drop OpenRouter-specific branch in `checkModelApiKey` if present (grep)
- `src/utils/curlCommand.ts` → confirm no dedicated builder; OpenRouter is OpenAI-compatible, just drop from `OPENAI_COMPATIBLE_PROVIDERS` if listed
- `src/LLMProviders/chainRunner/utils/ThinkBlockStreamer.ts` → drop `handleOpenRouterChunk` (~50 LOC) and the routing that calls it

**Grep recipe** to find anything missed:

```bash
grep -rn "OPENROUTERAI\|openRouterAi\|openrouterai\|OpenRouter\|openrouter\.ai" --include="*.ts" --include="*.tsx" src/
```

**Verification**: `npm run lint && npm test -- --runInBand && npm run build`

**Expected diff**: ~600 lines removed, 12–15 files.

**Risk**: medium. `defaultProvider` in `ModelAddDialog` currently falls back to OPENROUTERAI; pick `OLLAMA` as new default and verify the picker still mounts.

### Phase B-2 — `LM_STUDIO`

LM Studio is OpenAI-compatible with extra niceties (Responses API). With Ollama covering local already, LM Studio adds confusion more than value.

**Files** (grep `LM_STUDIO\|ChatLMStudio\|lmStudio\|LM Studio`):

- `src/LLMProviders/ChatLMStudio.ts` → delete (only used inside chatModelManager already; was actually wired through `ChatOpenRouter` in places — confirm)
- `src/LLMProviders/chatModelManager.ts` → drop LM_STUDIO from constructors, providerConfig, providerApiKey, the Responses API branch around `useResponsesApi`
- `src/LLMProviders/embeddingManager.ts` → drop LM_STUDIO entries
- `src/constants.ts` → drop enum value (chat + embedding), ProviderInfo, the OpenAI-compatible-providers tuple at line 320–321
- `src/aiParams.ts` → drop `useResponsesApi?: boolean` LM-Studio comment + field if it's LM-Studio-only
- `src/settings/v2/components/ModelEditDialog.tsx` → drop Responses API toggle around line 300
- `src/settings/v2/components/ModelAddDialog.tsx` → drop LM Studio reference around line 705
- `src/utils.ts` → drop LM_STUDIO from any "local providers" tuple (line ~1226)
- `src/utils/curlCommand.ts` → drop from `OPENAI_COMPATIBLE_PROVIDERS` set
- `src/utils/modelUtils.ts` → drop from "local providers don't require API keys" list
- `src/components/ui/ModelParametersEditor.tsx` → drop `model.provider === LM_STUDIO` (line ~79)
- `src/utils/stripSpecialTokens.ts` → only a comment mention; clean it up

**Verification**: same as B-1.

**Expected diff**: ~300 lines removed, 12 files.

### Phase B-3 — `GITHUB_COPILOT`

Has its own folder and OAuth flow.

**Files** (grep `GITHUB_COPILOT\|GitHubCopilot\|githubCopilot`):

- `src/LLMProviders/githubCopilot/**` → delete entire directory
- `src/settings/v2/components/GitHubCopilotAuth.tsx` → delete
- `src/settings/v2/components/ApiKeyDialog.tsx` → drop GitHub Copilot section
- `src/settings/v2/utils/modelActions.ts` → drop GitHub Copilot helpers
- `src/settings/providerModels.ts` → drop `GitHubCopilotModelResponse`, adapter
- `src/encryptionService.ts` → drop `githubCopilotAccessToken`, `githubCopilotToken`, `githubCopilotTokenExpiresAt` from the encrypt-key list
- `src/utils.ts` → drop GitHub Copilot OAuth branch in `checkModelApiKey` (line ~1267 after Bedrock removal)
- `src/constants.ts` → drop enum, ProviderInfo, ProviderSettingsKeyMap, the `githubCopilot*` defaults
- `src/settings/model.ts` → drop the three GitHub Copilot fields
- `src/LLMProviders/chatModelManager.ts` → drop GITHUB_COPILOT entries

**Risk**: medium-high. OAuth flow has its own modal lifecycle and error states. Run the whole settings page after the cut.

**Expected diff**: ~800 lines, 10 files.

### Phase B-4 — `OPENAI`, `AZURE_OPENAI`, `SILICONFLOW`, optionally `OPENAI_FORMAT`

Group these because they all use `ChatOpenAI` from `@langchain/openai`. After this phase the `@langchain/openai` dep is droppable (only if Option 1 chosen for `OPENAI_FORMAT`).

If keeping `OPENAI_FORMAT` (Option 2 above): rename it to `OPENAI_COMPATIBLE` for clarity, keep one copy of `ChatOpenAI` wiring for that case. Drop everything else.

**Files** (grep each enum value separately, plus `openAIApiKey`, `openAIOrgId`, `azureOpenAI`, `siliconflowApiKey`):

- `src/constants.ts` → drop the three (or four) enum values, ProviderInfo entries, defaults, `openAIOrgId`
- `src/settings/model.ts` → drop `openAIApiKey`, `openAIOrgId`, `azureOpenAI*` (5 fields), `siliconflowApiKey`
- `src/aiParams.ts` → drop `openAIApiKey`, `openAIOrgId`, `azureOpenAIApiKey`, all azure fields, also clean `apiKey?` comment about Google/TogetherAI sharing
- `src/LLMProviders/chatModelManager.ts` → drop the four constructors, providerApiKey entries, providerConfig blocks (Azure has its own normalizeAzureUrl helper — drop it too)
- `src/LLMProviders/embeddingManager.ts` → drop OpenAI, Azure, SiliconFlow from constructors / providerApiKey / config
- `src/LLMProviders/CustomOpenAIEmbeddings.ts` → delete (only used by cloud-OpenAI-compat embeddings)
- `src/settings/v2/components/ModelEditDialog.tsx`, `ModelAddDialog.tsx` → drop OpenAI/Azure-specific UI (`isAzureProvider`, instance/deployment/version inputs)
- `src/settings/providerModels.ts` → drop `OpenAIModelResponse`, `AzureOpenAIResponse` if any, `SiliconFlowModelResponse`, adapters
- `src/utils.ts`, `src/utils/curlCommand.ts`, `src/utils/modelUtils.ts` → grep cleanup

**Risk**: high. This is the biggest single phase. Test the settings page closely.

**Expected diff**: ~1500 lines, 15+ files.

### Phase B-5 — `ANTHROPIC`, `GOOGLE`, `XAI`, `MISTRAL`, `GROQ`, `DEEPSEEK`, `COHEREAI`

Per-provider, but each is small (one constructor, one providerConfig block, one settings field, one adapter). Do them in **one commit** if you can fit it; otherwise split per-provider.

**Files**: same shape as B-4 but smaller per provider.

**SDK packages dropped after this phase** (in `package.json`):

```text
@langchain/anthropic
@langchain/cohere
@langchain/deepseek
@langchain/google-genai
@langchain/groq
@langchain/mistralai
@langchain/xai
@google/generative-ai
@huggingface/inference
cohere-ai
```

Run `npm uninstall <list>`. Do not delete by hand — use the CLI so the lockfile updates atomically.

**Expected diff**: ~1200 lines, 15 files.

### Phase B-6 — `COPILOT_PLUS` + Brevilabs cloud proxy + `plusUtils` paradigm

**This is the most entangled phase. Read carefully.**

The `Copilot Plus` model in this codebase is a paid subscription tier (`plusLicenseKey`) that proxies LLM calls and parsers through `https://api.brevilabs.com/v1`. KOS2's product strategy explicitly rejects this. Removal:

**Files to delete**:

- `src/plusUtils.ts`, `src/plusUtils.test.ts`
- `src/LLMProviders/brevilabsClient.ts`
- `src/LLMProviders/selfHostServices.ts`, `src/LLMProviders/selfHostServices.test.ts`
- `src/components/modals/CopilotPlusWelcomeModal.tsx`
- `src/settings/v2/components/CopilotPlusSettings.tsx`
- `src/LLMProviders/CustomJinaEmbeddings.ts` (Brevilabs Jina embeddings)

**Strategic call before starting**: PDF parsing and web search currently route through Brevilabs. Replacements:

- **PDF parsing** — keep using Obsidian's built-in PDF support and the local `convertedDocOutput` flow. `src/cache/pdfCache.ts` and `src/tools/FileParserManager.ts` need their `BrevilabsClient` calls swapped out for the local-first path that already exists for converted docs.
- **Web search / fetch** — KOS2 already uses `Ollama Cloud` for these. Confirm `src/services/ollama/ollamaCloud.ts` covers the cases that `BrevilabsClient` covered. If yes, drop. If no, log it as a feature gap and ship without web search.

**Files to edit** (all touch the imports above):

- `src/main.ts` → drop `BrevilabsClient`, `checkIsPlusUser`, `refreshSelfHostModeValidation`, `CopilotPlusWelcomeModal`, plus init calls
- `src/tools/FileParserManager.ts`, `src/tools/SearchTools.ts`, `src/cache/pdfCache.ts` → swap Brevilabs → local
- `src/mentions/Mention.ts` → drop Brevilabs web search; route to Ollama Cloud
- `src/search/hybridRetriever.ts`, `src/search/searchUtils.test.ts` → drop Brevilabs branches
- `src/LLMProviders/projectManager.ts` → has Brevilabs token-budget calls; review case by case
- `src/aiParams.ts` → drop `plusExclusive`, `believerExclusive` fields on `CustomModel`
- `src/constants.ts` → drop `BREVILABS_API_BASE_URL`, `BREVILABS_MODELS_BASE_URL`, `PLUS_UTM_MEDIUMS`, `EmbeddingModelProviders.COPILOT_PLUS*`
- `src/settings/model.ts` → drop `plusLicenseKey`
- `src/encryptionService.ts` → drop plus license key from encrypt list
- `src/LLMProviders/chatModelManager.ts` → drop `isPlusEnabled` import, `plusExclusive` check inside `isModelConfigValid`

**Verification**: heaviest of all phases. Run the full suite plus a manual smoke (load a vault, run organise, check no Brevilabs URL appears in network).

**Expected diff**: ~3000 lines removed, 25+ files.

### Phase B-7 — Miyo cloud index

Miyo is a cloud-based vector index alternative to the local one. KOS2 already has a local index (`src/search/v3/**`).

**Files to delete**:

- `src/miyo/**` (5 files)
- `src/search/miyo/**` (2 files)
- `src/search/indexBackend/MiyoIndexBackend.ts`
- `docs/miyo-api.md`

**Files to edit** (grep `Miyo\|miyo`):

- `src/search/RetrieverFactory.ts` → drop Miyo branch
- `src/search/findRelevantNotes.ts`, `src/search/findRelevantNotes.test.ts` → drop Miyo branches
- `src/search/vectorStoreManager.ts` → drop Miyo branch
- `src/tools/SearchTools.ts`, `src/tools/FileParserManager.ts` → drop Miyo branches
- `src/settings/v2/components/CopilotPlusSettings.tsx` → already deleted in B-6

**Risk**: medium. The retrieval factory has fallback logic — make sure the local v3 path is the unconditional default after this.

**Expected diff**: ~1500 lines removed, 12 files.

### Phase B-8 — `OPENAI_FORMAT` rename to `OPENAI_COMPATIBLE` (only if Option 2)

Cosmetic but matches the new mental model.

- `src/constants.ts` → enum rename + value (`"3rd party (openai-format)"` → `"openai-compatible"`)
- `src/settings/v2/components/ModelEditDialog.tsx`, `ModelAddDialog.tsx` → label updates
- migration in `src/settings/model.ts` (`sanitizeSettings`) so existing user models with provider `"3rd party (openai-format)"` map to the new enum value on load. **Do not** ship without this migration.

### Phase C — Internal rebrand `CopilotPlugin` → `KOS2Plugin`

Mechanical, but touches every file that references `CopilotPlugin`.

- `src/main.ts` → `class CopilotPlugin extends Plugin` → `class KOS2Plugin extends Plugin`. Default export change.
- `src/components/CopilotView.tsx` → rename to `KOS2View.tsx`. Class `CopilotView` → `KOS2View`.
- `src/components/composer/ApplyView.tsx` → `APPLY_VIEW_TYPE` is already `"copilot-apply-view"` — bump string, add migration so old views in workspace layout still load.
- `src/settings/SettingsPage.tsx` → `class CopilotSettingTab` → `class KOS2SettingTab`
- `src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts` → rename file to `KOS2AgentChainRunner.ts`, rename class.
- folder defaults in `src/constants.ts`:
  - `LEGACY_COPILOT_FOLDER_ROOT = "kos2"` → keep as legacy, add `LEGACY_COPILOT_FOLDER_ROOT_V2 = "copilot"`
  - `DEFAULT_CHAT_HISTORY_FOLDER = "${COPILOT_FOLDER_ROOT}/copilot-conversations"` → `"${COPILOT_FOLDER_ROOT}/chats"`
  - `DEFAULT_CUSTOM_PROMPTS_FOLDER` → `"${COPILOT_FOLDER_ROOT}/prompts"`
  - the migration logic in `src/main.ts:loadSettings` already handles folder moves; reuse the same pattern for the new folder names

**Risk**: low if done in one commit. View type strings and folder paths are user-facing — every rename needs a one-shot migration so existing vaults don't lose their workspace layout or saved chats.

**Expected diff**: ~50 files touched, mostly imports/identifier renames; 3-4 files with actual logic changes (migrations).

### Phase D — package.json final cleanup

After Phases B-1 → B-7 land, run:

```bash
npm uninstall \
  @google/generative-ai \
  @huggingface/inference \
  @langchain/anthropic \
  @langchain/cohere \
  @langchain/deepseek \
  @langchain/google-genai \
  @langchain/groq \
  @langchain/mistralai \
  @langchain/openai \
  @langchain/xai \
  cohere-ai
```

If `OPENAI_FORMAT` was kept (Option 2), `@langchain/openai` stays.

Confirm `axios` is unused (`grep -rn "from \"axios\"" src/`); if unused, drop.

`sse: github:mpetazzoni/sse.js` — replace usages with `eventsource-parser` (already a dep). Then `npm uninstall sse`.

Re-run `npm audit` and report the new count.

### Phase E — `npm audit` cleanup of remaining issues

After Phase D the AWS SDK / Brevilabs / cloud SDK transitive vulns are gone. Remaining likely culprits:

- `axios` (if not dropped) — `npm audit fix` should handle
- `electron@27` — devDep, dependabot it
- `koa@2`, `koa-proxies` — used by `selfHostServices.ts`. After B-6 (selfHostServices deletion), these are likely unused; confirm and drop.
- `react-syntax-highlighter` — UI code path in chat. Update via `npm update` if no breaking change.
- `lint-staged`, `jest-environment-jsdom` — devDeps, dependabot

### Phase F — `crypto-js` → Web Crypto

`src/encryptionService.ts` uses `crypto-js` AES (CVE-2023-46233 weak PRNG). Replacement:

```ts
// Replace CryptoJS.AES.encrypt(plaintext, key) with crypto.subtle:
const enc = new TextEncoder();
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  enc.encode(passphrase).slice(0, 32), // pad/truncate to 32 bytes
  "AES-GCM",
  false,
  ["encrypt", "decrypt"]
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  keyMaterial,
  enc.encode(plaintext)
);
// store base64(iv || ciphertext)
```

Migration: existing encrypted keys use CryptoJS format. On first decrypt failure with the new code, fall back to old `CryptoJS.AES.decrypt`, re-encrypt with Web Crypto, persist. After ~3 release cycles, remove the fallback. **Do not ship a hard cutoff** — users will lose their stored API keys.

After migration: `npm uninstall crypto-js @types/crypto-js`.

## How to use this plan as Sonnet/Haiku

For each phase:

1. Read the phase header in this doc.
2. Run the grep recipe.
3. Compare against the file list — if grep returns paths not on the list, add them.
4. Apply changes file by file. Each file change should be small and obvious from the grep result.
5. After every phase: `npm run lint && npm test -- --runInBand && npm run build`. All three must pass.
6. Commit the phase as one focused commit: `feat: remove <provider name>` (use the Bedrock commit `e920f03` as the message template).
7. Update this plan doc — mark the phase done with the commit SHA — and tick the matching `TodoWrite` entry if you keep one.

**Use the Bedrock commit `e920f03` as the canonical example.** It cuts:

- `src/LLMProviders/BedrockChatModel.ts` (file)
- `src/LLMProviders/BedrockChatModel.test.ts` (file)
- enum value, ProviderInfo, ProviderSettingsKeyMap, defaults
- `chatModelManager.ts` constructor + apiKey + config + special config method + credential check branch
- `aiParams.ts` field
- `settings/model.ts` interface fields
- `settings/providerModels.ts` response/adapter entry
- `settings/v2/components/ModelEditDialog.tsx` provider-specific UI block
- `settings/v2/components/ModelAddDialog.tsx` provider-specific switch case + initialization
- `utils.ts` `checkModelApiKey` branch
- `utils/curlCommand.ts` provider-specific builder

Every other provider is the same shape. Don't reinvent — copy the Bedrock cleanup pattern and apply it.

## Things I am explicitly NOT recommending (yet)

- **Refactoring the long files** (`utils.ts` 1546, `Chat.tsx` 1029) — wait until after the Ollama-only cleanup. They will be much shorter once cloud branches go away.
- **Adding a feature flag for the cleanup** — KOS2 hasn't shipped to a wide audience; just ship the cuts.
- **New product docs** — when something concrete needs designing (e.g. the new `Knowledge` tab IA after `OPENAI_FORMAT` rename), write a short prompt and hand it to a design-specialty agent. The current docs only need pruning, not net new authoring.

## Quick risk register

| risk                                                                | likelihood     | mitigation                                                                                              |
| ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| user with `provider: "openai"` model loses it after Phase B-4       | high           | settings migration in `sanitizeSettings` that drops unsupported provider configs with a one-time Notice |
| user's `plusLicenseKey` setting sticks around in persisted settings | low (visual)   | sanitizeSettings drops removed keys                                                                     |
| view type rename in Phase C breaks workspace layouts                | medium         | migration that replaces the old type string in `app.workspace.getLayout()`                              |
| crypto-js migration loses encrypted keys                            | high if rushed | dual-decrypt fallback for ≥ 3 release cycles                                                            |
| AWS SDK still pulled by `@langchain/community` after Phase D        | medium         | confirm with `npm ls @aws-sdk/client-bedrock` after; if so, file an upstream issue or pin               |

## Success criteria

End state, validated:

- `grep -rn "ChatModelProviders\." src/` returns only `OLLAMA` (and `OPENAI_COMPATIBLE` if Option 2)
- `npm audit --omit=dev --audit-level=high` returns 0 highs / 0 criticals
- `du -sh main.js` ≤ 3 MB
- `class CopilotPlugin` and `class CopilotView` no longer exist
- `BREVILABS_*_BASE_URL` no longer exists
- `crypto-js` no longer in deps
- README, manifest, and PRD all describe the same product
