# KOS2 Test Strategy

## 1. Cel testów

Testy mają chronić trzy rzeczy:

- poprawność workflowów KOS
- stabilność runtime Ollama local/cloud
- wydajność odczuwalną na Apple Silicon

## 2. Poziomy testów

## 2.1 Unit tests

Zakres:

- key resolution
- provider adapters
- config validation
- intent routing helpers
- citation formatting
- diff/write safety helpers

Przykładowe moduły:

- `src/services/ollama/*`
- `src/plusUtils.ts`
- `src/utils.ts`
- nowe moduły KOS command surface

## 2.2 Integration tests

Zakres:

- chat path przez local Ollama
- embedding path przez local Ollama
- web search adapter z mockiem i real smoke
- indexing i retrieval na testowym vaultcie
- `organise`, `next-steps`, `decision`, `review`

Zasada:

- regular CI: mock/stub where possible
- lokalne gated smoke: real Ollama

## 2.3 Smoke tests

Smoke ma być szybki i brutalnie praktyczny.

Minimalny zakres:

- build pluginu
- local Ollama tags
- local chat
- local embeddings
- Ollama Cloud web search

Aktualny bootstrap smoke:

- [scripts/smoke-ollama.sh](/Users/pd/Developer/KOS2/scripts/smoke-ollama.sh)

Kontrakt smoke dla `Milestone 0/1`:

- obowiązkowe komendy gate:
  - `npm run build`
  - `npm run smoke:ollama`
- `local-only pass`:
  - local Ollama tags, chat i embeddings przechodzą,
  - brak cloud key nie oblewa całego smoke, tylko jawnie skipuje część webową
- `cloud-ready pass`:
  - przy obecnym kluczu przechodzi także web search przez Ollama Cloud

## 2.4 Manual acceptance tests

Scenariusze obowiązkowe:

1. install pluginu do testowego vaulta
2. wybór lokalnego modelu
3. prosty chat
4. retrieval pytania o vault
5. `organise`
6. `next-steps`
7. `decision`
8. `review`
9. web search przez Ollama Cloud
10. preview edycji pliku przed zapisem

## 2.5 Benchmarks

Mierzymy:

- cold start chat latency
- warm chat latency
- embed latency
- indexing time dla test vaulta
- retrieval latency

Benchmark musi podawać:

- model
- host
- vault size fixture
- cold vs warm

Aktualny skeleton benchmarku:

- [scripts/benchmark-kos2.sh](/Users/pd/Developer/KOS2/scripts/benchmark-kos2.sh)
- env contract:
  - `LOCAL_OLLAMA_URL`
  - `KOS2_BENCH_CHAT_MODEL`
  - `KOS2_BENCH_EMBED_MODEL`
- output contract:
  - JSON na stdout
  - krótki summary log na stderr

## 3. Fixture strategy

## 3.1 Test vault

Potrzebny jest jawny, mały testowy vault zawierający:

- `01_Inbox`
- `10_Projects`
- `20_Areas`
- `30_Resources`
- kilka analysis/decision/outcome notes
- przykłady `needs-review`

Aktualna ścieżka fixture:

- [src/integration_tests/fixtures/kos2-vault/README.md](/Users/pd/Developer/KOS2/src/integration_tests/fixtures/kos2-vault/README.md)

## 3.2 Web fixtures

- HTML page fixture
- plain text fixture
- mocked web_search responses

## 3.3 Ingest fixtures

Te dopiero w ostatnim epiku:

- PDF
- EPUB
- DOCX
- PPTX
- sample YouTube URLs / transcript payloads

## 4. Gates jakości

## 4.1 Gate commit/branch

- build przechodzi
- unit tests przechodzą

## 4.2 Gate sprint completion

- integration tests dla scope sprintu przechodzą
- smoke local/cloud przechodzi

Obowiązkowe testy per sprint:

- `Milestone 0`
  - build
  - unit tests dla runtime helpers
  - integration test fixture contract
  - smoke lokalny, jeśli host Ollamy jest dostępny
- `Milestone 1`
  - build
  - unit tests dla key resolution i compat shim
  - integration test fixture contract
  - smoke local-only
  - smoke cloud-ready, jeśli klucz jest dostępny

## 4.3 Gate release candidate

- pełny smoke
- manual acceptance checklist
- benchmark comparison bez istotnej regresji

## 5. Priorytety testowe

Najpierw testujemy:

1. runtime Ollama
2. KOS command surface
3. retrieval/indexing
4. write safety
5. web tools
6. dopiero na końcu ingest/transcript

## 6. Definition of Done dla jakości

Feature nie jest gotowy, jeśli:

- działa tylko manualnie, bez testu
- nie ma smoke/integration coverage dla krytycznej ścieżki
- psuje local-first assumptions
- pogarsza benchmark bez świadomej decyzji
