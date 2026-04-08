# KOS2 Sprint Plan To Release

## Stan wejściowy

Bootstrap repo jest gotowy:

- soft fork istnieje
- build przechodzi
- smoke local/cloud przechodzi
- podstawowe artefakty BMAD są w repo

## Parametry wykonania

- cadence: milestone-based
- release target: GitHub release artifacts, nie marketplace
- release ladder:
  - Alpha prerelease
  - Release Candidate
  - General Availability
- zasada scope:
  - rdzeń KOS2 musi dojść do stabilnego Alpha bez ingest/transcript
  - PDF/EPUB/rich-doc ingest i YouTube transcript wchodzą dopiero w ostatnim milestone

## Zalecana sekwencja BMAD

1. `bmad-bmm-create-prd`
2. `bmad-bmm-create-architecture`
3. `bmad-bmm-create-epics-and-stories`
4. `bmad-bmm-check-implementation-readiness`
5. `bmad-bmm-sprint-planning`
6. dopiero potem `bmad-bmm-dev-story`

## Milestone 0. Readiness And Fixtures

Cel:

- ustalić test vault
- ustalić contracts dla 4 workflowów KOS
- ustalić benchmark harness

Deliverables:

- test vault fixtures
- acceptance checklist
- benchmark script skeleton

Release output:

- zamknięty baseline do rozpoczęcia implementacji

Gate:

- build green
- smoke local/cloud green
- contracts dla workflowów KOS zapisane

## Milestone 1. Ollama Runtime Hardening

Epiki:

- Epic 1

Deliverables:

- stabilne settings
- model ping/smoke UX
- local-first defaults

Gate:

- smoke local/cloud przechodzi
- local-only mode działa bez klucza
- cloud path nie ingeruje w local-only runtime

## Milestone 2. KOS Workflow Surface

Epiki:

- Epic 2

Deliverables:

- `organise`
- `next-steps`
- `decision`
- `review`

Gate:

- integration tests dla podstawowych workflowów
- output contracts są stabilne

## Milestone 3. Retrieval And Indexing

Epiki:

- Epic 3

Deliverables:

- retrieval strategy pod KOS
- stabilny indexing
- test vault coverage

Gate:

- retrieval benchmark i integration tests
- test vault fixtures działają

## Milestone 4. Write Safety And Artifact Control

Epiki:

- Epic 4

Deliverables:

- dopasowany apply preview
- output contracts dla artefaktów

Gate:

- manual acceptance + regression tests
- preview/write safety bez silent overwrite

## Milestone 5. Web Tooling

Epiki:

- Epic 5

Deliverables:

- web search
- URL fetch
- citation flow

Gate:

- smoke cloud
- integration with agent flow
- citations i URL fetch są stabilne

Release output:

- **Alpha GitHub prerelease**

Alpha scope:

- runtime Ollama local/cloud
- 4 workflowy KOS
- retrieval/indexing
- write safety
- web tooling

## Milestone 6. UX Cleanup And Hardening

Epiki:

- Epic 6
- Epic 7 częściowo

Deliverables:

- cleanup visible legacy debt
- lepsze docs i troubleshooting
- pełniejsze test coverage

Gate:

- release candidate quality bar przygotowany
- visible legacy debt usunięty z głównych ścieżek
- docs operatora i użytkownika gotowe

## Milestone 7. Document Ingest And YouTube Transcript

Epiki:

- Epic 8

To jest końcowy milestone, nie wcześniejszy.

Deliverables:

- PDF ingest
- EPUB/rich-doc ingest
- YouTube transcript

Gate:

- regression suite
- benchmark comparison
- final acceptance checklist

Release output:

- **Release Candidate** po wdrożeniu ingest/transcript i pełnej regresji
- **General Availability** po zamknięciu uwag RC i finalnej walidacji jakości

## Kryteria wejścia do implementacji

- PRD zaakceptowane
- architektura zaakceptowana
- epiki/stories zaakceptowane
- test strategy zaakceptowana
- fixture strategy ustalona

## Kryteria wyjścia z planowania

- zespół może wejść w `dev-story` bez dopowiadania założeń w locie
- scope końcowego sprintu ingest/transcript jest odseparowany od rdzenia
- istnieją jawne gates jakości i wydajności

## Kryteria wydania GitHub

### Alpha prerelease

- Milestones 1-5 zamknięte
- smoke green
- integration green dla rdzenia
- ręczna instalacja do testowego vaulta potwierdzona

### Release Candidate

- Milestone 7 zamknięty
- ingest/transcript green
- brak regresji względem Alpha

### General Availability

- uwagi z RC zamknięte
- benchmark regression akceptowalny
- final release notes i artefakty gotowe:
  - `main.js`
  - `manifest.json`
  - `styles.css`
