# Claude Claim: Docs, Cleanup, Security & Ollama-Only Refactor

- Agent: Claude
- Branch: `claude/docs-and-cleanup`
- Worktree: `.claude/worktrees/claude-docs-and-cleanup` (isolated; Codex untouched)
- Started: 2026-05-06 CEST
- Status: COMPLETE (2026-06-08) — Ollama-only refactor finished (B-1…B-8, C, D, E, F), all gates green, ready to merge to `main` and release. See [`docs/cleanup/ollama-only-refactor-plan.md`](../cleanup/ollama-only-refactor-plan.md) status banner.

## Owned paths

- `CONTRIBUTING.md`
- `README.md`
- `RELEASES.md`
- `versions.json`
- `manifest.json` (only if version coordination needs it; coordinate first)
- `CHANGELOG.md` (coordinate before commit; shared file)
- `package.json`, `package-lock.json` (coordinate before commit; shared file)
- `.gitignore`
- `.github/workflows/**`
- `docs/**` (excluding `docs/agent-claims/codex-*.md`)
- `designdocs/**` (read-only audit; only delete out-of-scope artifacts)
- `local_copilot.md`, `output/` (cleanup of leftover working files)
- `images/` (audit and prune unused)
- KOS2 source for the Ollama-only refactor:
  - `src/LLMProviders/BedrockChatModel*.ts` (delete)
  - `src/LLMProviders/ChatOpenRouter.ts`, `ChatLMStudio.ts` (delete)
  - `src/LLMProviders/githubCopilot/**` (delete)
  - `src/LLMProviders/brevilabsClient.ts` (delete or stub if upstream-coupled)
  - `src/miyo/**` (delete if not part of Ollama path)
  - `src/plusUtils*.ts` (rename/refactor — Plus paradigm)
  - `src/main.ts` rebrand `CopilotPlugin` → `KOS2Plugin`
  - cloud SDK provider wiring across `src/aiParams.ts`, `src/constants.ts`, `src/settings/**`, `src/LLMProviders/chatModelManager.ts`, `src/LLMProviders/embeddingManager.ts`
  - `package.json` removal of cloud LLM SDKs

## Non-owned paths to avoid

- `src/kos/cleanup/**` — Codex (`codex/cleanup-reliability-hotfix`)
- `src/kos/doctor/**` — Codex (`codex/doctor-readiness-hardening`)
- `__mocks__/obsidian.js` — Codex
- `docs/agent-claims/codex-*.md`
- `AGENTS.md`, `CLAUDE.md`, `docs/agent-collaboration.md`, `docs/agent-claims/README.md` — Codex (coordination policy author)

## Current intent

Rolled out in phases to keep risk low and merges atomic:

- **Phase A — docs and meta** (low-risk warm-up):
  - rebrand `CONTRIBUTING.md` from upstream Copilot to KOS2 (kill `npm run dev` instruction, brevilabs links, Discord, Logan email, GEMINI/OpenAI key references)
  - clarify versioning convention `YY.MM.X` in `CHANGELOG.md` and where it appears
  - `.gitignore`: add `.DS_Store` (and check `output/`, `local_copilot.md`)
  - audit `local_copilot.md` and `output/` and remove if dead
  - audit `images/` and remove unused assets
  - trim upstream history in `RELEASES.md` and `versions.json` (preserve enough for BRAT)
  - prune `designdocs/` artifacts that describe out-of-scope features (e.g. `BEDROCK_TOOL_CALLING.md`)
- **Phase B — Ollama-only refactor**:
  - delete cloud LLM provider SDKs and their wiring
  - rename `CopilotPlugin` → `KOS2Plugin`, `CopilotView` → `KOS2View`, etc.
  - remove `plusUtils` Plus paradigm
  - keep Ollama local + Ollama Cloud (web tools) only
- **Phase C — `npm audit` cleanup**:
  - run `npm audit fix` after Phase B (most vulns are transitive via `@langchain/community` and AWS SDK; gone with Phase B)
  - replace `crypto-js` with Web Crypto / `subtle`
  - replace `sse: github:mpetazzoni/sse.js` with `eventsource-parser` (already in deps)
- **Phase D — CI gates**:
  - `npm audit` gate in `node.js.yml`
  - bundle size budget in CI
  - link check for `docs/`

## Deferred (per user direction)

- `designdocs/todo/TECHDEBT.md` refresh — after the structural cleanup
- decomposition of long files (`utils.ts`, `Chat.tsx`, etc.) — context-heavy, separate session
- new design docs — when needed, prepare a prompt for the design-specialised model rather than write directly

## Verification plan

After each phase:

- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`
- `npm audit --omit=dev` (track count)
- `du -sh main.js` (track bundle size)

## Coordination notes

- Codex owns `src/kos/cleanup/**`, `src/kos/doctor/**`, `__mocks__/obsidian.js`, `AGENTS.md`, `CLAUDE.md`, `docs/agent-collaboration.md`, `docs/agent-claims/README.md`. I do not edit those.
- Before any commit touching `package.json`, `package-lock.json`, or `CHANGELOG.md` I will re-check Codex claims and update this file.
- Working in an isolated git worktree at `.claude/worktrees/claude-docs-and-cleanup` so Codex's working tree on `codex/doctor-readiness-hardening` is undisturbed.
