# KOS2 Release QA Checklist

## Cel

To jest aktualna ręczna checklista dla release line KOS2. Służy do walidacji runtime, settings, workflow surface i public release quality po ostatnich poprawkach, a nie do planowania `Milestone 0/1`.

## Core Runtime

- [ ] Plugin buduje się lokalnie.
- [ ] Domyślny chat model wskazuje na Ollamę.
- [ ] Domyślny embedding model wskazuje na Ollamę.
- [ ] Settings jasno pokazują, że local Ollama nie wymaga API key.
- [ ] Settings jasno pokazują, że Ollama Cloud jest opcjonalny i służy tylko do web tools.
- [ ] Brak Ollama Cloud key nie wygląda jak awaria całego runtime.
- [ ] Główne settings i onboarding nie mówią o zakupie, subskrypcji ani renew.

## Privacy And Cloud Split

- [ ] `Privacy (local) Mode` utrzymuje lokalną ścieżkę jako domyślną.
- [ ] `KOS2 Local Agent` wskazuje wyłącznie lokalny model Ollamy.
- [ ] UI jasno rozróżnia `Ollama Local` od `Ollama Cloud`.
- [ ] `ollamaCloudApiKey` można zapisać w settings.
- [ ] `OLLAMA_API_KEY` jest rozpoznawany jako alternatywne źródło.
- [ ] macOS Keychain item `cos2-ollama-cloud` jest opisany jako fallback.
- [ ] Web search działa po skonfigurowaniu klucza.

## Knowledge And Embeddings

- [ ] `Knowledge` pokazuje lokalny inventory modeli po `Refresh Ollama Models`.
- [ ] Lokalny embedding model jest widoczny i wybieralny.
- [ ] Semantic search można włączyć z lokalnym embedding model path.
- [ ] Brak cloud key nie blokuje lokalnych embeddingów ani local retrieval.

## Workflow Surface

- [ ] Command palette pokazuje cztery workflowy KOS.
- [ ] `organise` działa na aktywnej notatce i zwraca routing + recommended next step.
- [ ] `organise` na surowym intake pokazuje intake signals.
- [ ] `organise` na surowym intake pokazuje ranked routes, jeśli istnieje więcej niż jedna sensowna ścieżka.
- [ ] `organise` pokazuje draft stabilizowanego artefaktu bez silent write.
- [ ] `organise` nie generuje sztucznego decision/review draftu.
- [ ] `next-steps` zwraca realne pending items z path traceability.
- [ ] `decision` tworzy draft decision artifact tylko wtedy, gdy istnieje analysis/evidence context.
- [ ] `decision` odmawia, jeśli aktywna notatka nie ma podstaw do draftu.
- [ ] `review` tworzy draft review/outcome update tylko przy istniejącym decision/review/outcome context.
- [ ] `review` odmawia, jeśli aktywna notatka nie ma takiego kontekstu.
- [ ] Workflow modal pozwala skopiować wynik.
- [ ] Workflow modal pozwala skopiować draft artefaktu, jeśli workflow go zwrócił.
- [ ] Workflow nie zapisuje nic do vaulta bez jawnej akcji usera.

## Release And Public Surface

- [ ] `README.md` pokazuje aktualny produkt, a nie inherited preview assets.
- [ ] Release artifacts zawierają `main.js`, `manifest.json`, `styles.css`.
- [ ] Social preview repo jest ustawiony.
- [ ] Nie ma publicznych API keyów ani śledzonych `.env`.

## Commands And Evidence

- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run test:integration`
- [ ] `npm run lint`
- [ ] `npm run smoke:ollama`

Zalecane evidence do zapisania po walidacji:

- wynik build/test/lint,
- wynik smoke lokalnego,
- wynik smoke cloud-ready, jeśli klucz był dostępny,
- krótki opis ręcznego przejścia przez setup, knowledge i onboarding,
- potwierdzenie działania `organise` z draft artifact preview.
