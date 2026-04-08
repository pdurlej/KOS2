# KOS2 Implementation Readiness

## Cel

Ten dokument zamyka fazę planowania i definiuje, po czym poznajemy, że można wejść w `bmad-bmm-dev-story` bez dopowiadania fundamentów w trakcie implementacji.

## Aktualny status

- status ogólny: `ready`
- ostatnia aktualizacja: `2026-04-03`
- dowody i kontrakty:
  - workflow contracts: [17-workflow-contracts-kos2.md](/Users/pd/Developer/KOS2/docs/bmad/17-workflow-contracts-kos2.md)
  - acceptance checklist: [18-manual-acceptance-checklist-kos2.md](/Users/pd/Developer/KOS2/docs/bmad/18-manual-acceptance-checklist-kos2.md)
  - smoke local/cloud: [scripts/smoke-ollama.sh](/Users/pd/Developer/KOS2/scripts/smoke-ollama.sh)
  - benchmark skeleton: [scripts/benchmark-kos2.sh](/Users/pd/Developer/KOS2/scripts/benchmark-kos2.sh)
  - test vault fixture: [src/integration_tests/fixtures/kos2-vault/README.md](/Users/pd/Developer/KOS2/src/integration_tests/fixtures/kos2-vault/README.md)

## 1. Readiness produktu

- [x] scope V1 jest zamknięty
- [x] ingest dokumentów i YouTube transcript są jawnie odłożone na ostatni epic
- [x] workflowy KOS w V1 są ustalone:
  - [x] organise
  - [x] next-steps
  - [x] decision
  - [x] review
- [x] out-of-scope jest zapisane i zaakceptowane

Dowody:

- PRD definiuje scope V1 i out-of-scope.
- Sprint plan utrzymuje ingest/transcript wyłącznie w końcowym milestone.
- Workflow contracts są spisane jawnie dla czterech flowów KOS.

## 2. Readiness architektury

- [x] decyzja `TypeScript shell + optional future Rust sidecar` jest zaakceptowana
- [x] decyzja `Ollama only` jest zaakceptowana
- [x] decyzja `no custom backend` jest zaakceptowana
- [x] provider layer ma ustalone kontrakty
- [x] retrieval/indexing layer ma ustalone kontrakty
- [x] write-preview layer ma ustalone kontrakty

Dowody:

- Architecture plan zamyka decyzję o TypeScript shell, Ollama-only i no-backend.
- Test strategy i smoke contract precyzują runtime local/cloud.
- Workflow contracts oraz acceptance checklist utrzymują jawny write-preview i refusal behavior.

## 3. Readiness testów

- [x] test strategy jest zaakceptowana
- [x] istnieje plan test vault fixtures
- [x] istnieje smoke path local/cloud
- [x] istnieje benchmark scope
- [x] wiadomo, które testy są obowiązkowe per sprint

Dowody:

- Test strategy wskazuje fixture path, smoke contract, benchmark skeleton i obowiązkowe testy per sprint.

## 4. Readiness operacyjna

- [x] repo build przechodzi
- [x] smoke local/cloud przechodzi
- [x] local Ollama jest dostępna
- [x] Ollama Cloud key path jest ustalony
- [x] istnieje testowy vault do manual acceptance

Dowody:

- Cloud key path jest ustalony przez settings, env i macOS Keychain.
- Test vault fixture został dodany do repo i może być użyty w manual acceptance oraz integration tests.
- `npm run build` przeszedł lokalnie.
- `npm run smoke:ollama` przeszedł lokalnie z local tags/chat/embed oraz web search przez Ollama Cloud.
- `npm run benchmark:kos2` przeszedł lokalnie i zwrócił minimalny JSON z cold/warm/embed latencies.

Blokery do domknięcia:

- wykonać ręczne acceptance w UI Obsidiana i zapisać evidence operatora.

## 5. Readiness stories

- [x] każdy epic ma stories z acceptance criteria
- [x] zależności między epikami są jawne
- [x] ostatni epic ingest/transcript nie blokuje wcześniejszych sprintów

Dowody:

- Epics and stories mają acceptance criteria per story.
- Sprint plan rozdziela M0/M1 od końcowego ingest/transcript milestone.

## 6. Exit criteria

Jeśli wszystkie sekcje powyżej są spełnione, można wejść w:

1. `bmad-bmm-check-implementation-readiness`
2. `bmad-bmm-sprint-planning`
3. `bmad-bmm-dev-story`
