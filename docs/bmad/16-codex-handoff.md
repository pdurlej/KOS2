# KOS2 Codex Handoff

## Cel

Ten plik jest krótkim handoffem dla kolejnego wątku Codexa uruchomionego bezpośrednio w `/Users/pd/Developer/KOS2`.

## Stan repo

- repo: `/Users/pd/Developer/KOS2`
- to jest aktywny soft fork `obsidian-copilot`
- runtime bootstrap jest już przepięty na:
  - Ollama local
  - Ollama Cloud web tools
- BMAD package znajduje się w `docs/bmad/`

## Główne dokumenty wejściowe

- [README BMAD](/Users/pd/Developer/KOS2/docs/bmad/README.md)
- [PRD](/Users/pd/Developer/KOS2/docs/bmad/10-prd-kos2.md)
- [Architecture](/Users/pd/Developer/KOS2/docs/bmad/11-architecture-kos2.md)
- [Epics And Stories](/Users/pd/Developer/KOS2/docs/bmad/12-epics-and-stories-kos2.md)
- [Test Strategy](/Users/pd/Developer/KOS2/docs/bmad/13-test-strategy-kos2.md)
- [Sprint Plan To Release](/Users/pd/Developer/KOS2/docs/bmad/14-sprint-plan-kos2.md)
- [Implementation Readiness](/Users/pd/Developer/KOS2/docs/bmad/15-implementation-readiness-kos2.md)

## Locki decyzyjne

- tylko `Ollama`
- brak custom backendu
- local-first
- GitHub release path, nie marketplace
- `Alpha -> RC -> GA`
- ingest/transcript dopiero na końcu

## Techniczne entrypointy

- smoke: [scripts/smoke-ollama.sh](/Users/pd/Developer/KOS2/scripts/smoke-ollama.sh)
- cloud helper: [src/services/ollama/ollamaCloud.ts](/Users/pd/Developer/KOS2/src/services/ollama/ollamaCloud.ts)
- settings defaults: [src/constants.ts](/Users/pd/Developer/KOS2/src/constants.ts)
- compatibility/gating shim: [src/plusUtils.ts](/Users/pd/Developer/KOS2/src/plusUtils.ts)

## Co robić dalej

1. otworzyć repo w `/Users/pd/Developer/KOS2`
2. przeczytać `docs/bmad/README.md`
3. zacząć od `Implementation Readiness`
4. wejść w Milestone 0 i Milestone 1

## Czego nie robić

- nie przenosić ingest/transcript do wcześniejszych milestone
- nie dodawać nowego backendu
- nie poszerzać provider scope poza Ollamę
