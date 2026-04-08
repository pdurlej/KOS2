# KOS2 Architecture Plan

## 1. Architektura docelowa

KOS2 pozostaje pluginem TypeScript/React dla Obsidiana. Nie budujemy backendu aplikacyjnego. Architektura ma być modułowa, local-first i gotowa do późniejszego hardeningu lub opcjonalnego sidecara w Rust.

## 2. Warstwy systemu

### 2.1 Plugin shell

Odpowiada za:

- lifecycle Obsidiana
- widoki, modale i settings
- rejestrację komend
- zarządzanie stanem UI

### 2.2 Provider layer

Jeden kierunek na start:

- `Ollama local / remote self-hosted`
- `Ollama Cloud` tylko dla web tools

Provider layer musi umieć:

- chat completions
- embeddings
- model discovery / validation
- key resolution dla cloud path

### 2.3 KOS orchestration layer

Warstwa semantyczna nad upstream agent tools:

- mapowanie workflowów KOS do tool flows
- policy-aware prompting
- capability gap handling
- write safety

### 2.4 Retrieval/indexing layer

- lokalne embeddingi przez Ollamę
- lexical + semantic retrieval
- indeksowanie vaulta
- cache i reindex policy

### 2.5 Ingest layer

Warstwa ingestu dokumentów i zewnętrznych źródeł.

Kolejność:

1. URL/web
2. dopiero na końcu: PDF/EPUB/rich-doc
3. dopiero na końcu: YouTube transcript

## 3. Decyzje architektoniczne

### 3.1 TypeScript zamiast rewrite do Rust

Powód:

- Obsidian wymaga plugin runtime w JS
- największe bottlenecks są zwykle poza językiem shellu
- na tym etapie szybszy time-to-value daje soft fork niż rewrite

### 3.2 Rust tylko po profilowaniu

Możliwe przyszłe use cases:

- ciężki local document ingest
- szybki local indexing backend
- specjalizowany parser pipeline

Warunek wejścia:

- profilowanie pokaże, że TS/JS jest realnym bottleneckiem
- bottleneck nie leży w samym model inference

### 3.3 No custom backend

Nie wprowadzamy:

- proxy modeli
- własnego auth service
- własnej web-search bramki

To chroni produkt przed niepotrzebnym wzrostem złożoności.

## 4. Moduły implementacyjne

### 4.1 Settings i konfiguracja

Konfiguracja ma obsłużyć:

- lokalny adres Ollama
- cloud key do Ollama Cloud
- self-host/local services config
- model defaults
- embedding defaults
- performance knobs

### 4.2 Model runtime

Odpowiada za:

- wybór modelu
- ping i smoke
- warm/cold diagnostics
- jawne błędy konfiguracji

### 4.3 KOS command surface

Dedykowane moduły lub tool wrappers dla:

- organise
- next-steps
- decision
- review

Każdy workflow musi mieć:

- input contract
- output contract
- refusal / capability-gap contract

### 4.4 Write pipeline

- composer/apply preview
- diff rendering
- ręczna akceptacja lub jawna auto-accept konfiguracja

### 4.5 Web tooling

- query normalization
- Ollama Cloud web search adapter
- URL fetch adapter
- source formatting i citations

### 4.6 Ingest pipeline

Ostatnia fala. Docelowo:

- PDF
- EPUB
- doc/docx
- ppt/pptx
- xls/xlsx
- transcript sources

## 5. Data flow

### 5.1 Chat / Agent

1. user input
2. active mode / KOS intent resolution
3. retrieval jeśli potrzebny
4. optional web tools jeśli user potrzebuje online context
5. model inference przez Ollamę
6. optional write preview

### 5.2 Organise flow

1. wskazanie pliku lub materiału
2. detekcja typu inputu
3. routing wg zasad KOS
4. jeśli capability istnieje:
   - wykonanie flow
5. jeśli capability nie istnieje:
   - nazwanie gap
   - propozycja następnego kroku

### 5.3 Decision flow

1. analysis/evidence input
2. generation or update decision artifact
3. optional follow-up suggestion do review

## 6. Minimalne granice odpowiedzialności

### 6.1 Upstream-compatible bootstrap adapter

Do czasu głębszego cleanupu można utrzymać kompatybilne nazwy klas, ale nie wolno zostawiać ich jako faktycznych zależności produktowych.

### 6.2 KOS-specific code

Nowa logika powinna iść do modułów KOS2, nie być dopisywana wszędzie jako if-y na starym Copilocie.

## 7. Architektura testów

### 7.1 Unit

- provider adapters
- settings resolution
- KOS intent routing
- retrieval utilities
- write safety helpers

### 7.2 Integration

- local Ollama chat path
- local Ollama embeddings path
- vault indexing path
- web search path z mockiem lub real smoke
- KOS workflow command handlers

### 7.3 End-to-end local plugin validation

- build pluginu
- instalacja do `.obsidian/plugins/kos2`
- uruchomienie w testowym vaultcie
- manual + scripted verification krytycznych flows

### 7.4 Benchmarks

- cold chat latency
- warm chat latency
- embedding latency
- indexing throughput
- retrieval latency

## 8. Główne ryzyka architektoniczne

- zbyt duże uzależnienie od upstream naming/debt
- agent loop zbyt ogólny względem KOS workflows
- słabe fixtures do testów vault-aware behavior
- ingest rozsadzi scope, jeśli wejdzie za wcześnie

## 9. Readiness criteria przed implementacją stories

- repo buduje się lokalnie
- smoke local/cloud przechodzi
- domyślne modele są ustalone
- test vault strategy jest ustalona
- output contracts dla KOS workflows są spisane
