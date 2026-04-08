# KOS2 Epics And Stories

## Założenie kolejności

Epiki są ułożone w kolejności wdrożenia. Ostatni epic obejmuje document ingest i YouTube transcript, zgodnie z decyzją projektową.

## Epic 1. Ollama Runtime Hardening

Cel: ustabilizować fundament lokalnej Ollamy i optional cloud path.

### Story 1.1

Użytkownik może uruchomić KOS2 z lokalną Ollamą bez API key.

Acceptance:

- plugin startuje bez błędów
- domyślny model i embedding model są poprawnie ustawione
- brak licencyjnych blokad w bootstrap path

### Story 1.2

Użytkownik może skonfigurować Ollama Cloud tylko dla web tools.

Acceptance:

- key resolution działa przez settings, env i Keychain
- brak wymogu klucza dla local-only flow
- sensowny error dla braku cloud key

### Story 1.3

Operator ma w settings czytelny ekran usług i modeli.

Acceptance:

- local Ollama i cloud path są opisane jasno
- branding nie sugeruje subskrypcji premium

## Epic 2. KOS Command Surface

Cel: przenieść najważniejsze workflowy KOS do pluginu.

### Story 2.1

Zaimportować semantykę `/organise` do KOS2.

Acceptance:

- flow potrafi przyjąć wskazany plik lub kontekst
- wykrywa capability gap zamiast generować fake analysis
- kończy się rekomendacją następnego kroku

### Story 2.2

Zaimportować `/next-steps`.

Acceptance:

- plugin raportuje realne pending work
- wynik jest spójny z zasadami KOS

### Story 2.3

Zaimportować `/decision`.

Acceptance:

- potrafi utworzyć decision artifact z analysis/evidence
- zachowuje traceability wejścia

### Story 2.4

Zaimportować `/review`.

Acceptance:

- potrafi domknąć decyzję outcome flow
- nie tworzy outcome na siłę, jeśli brak podstaw

## Epic 3. Retrieval And Indexing For KOS

Cel: zrobić retrieval, który wspiera workflowy KOS, a nie tylko generic QA.

### Story 3.1

Ustalić chunking i retrieval strategy dla notatek KOS.

Acceptance:

- retrieval uwzględnia strukturę notatek i frontmatter
- wyniki są bardziej trafne niż goły upstream default

### Story 3.2

Zhardenić indexing flow.

Acceptance:

- progress i błędy są czytelne
- force reindex działa
- indeks nie psuje się po zmianie modeli

### Story 3.3

Zrobić test vault fixtures dla KOS.

Acceptance:

- istnieje mały testowy vault z projektami, obszarami, inboxem i decyzjami
- integration tests odpalają się na tym fixture

## Epic 4. Write Safety And Artifact Control

Cel: utrzymać przewidywalność i brak “silent writes”.

### Story 4.1

Zachować i dopasować apply preview do workflowów KOS.

Acceptance:

- każda krytyczna edycja ma preview
- diff jest czytelny

### Story 4.2

Doprecyzować output contracts dla analysis/decision/review flows.

Acceptance:

- zapis plików jest zgodny z kontraktem KOS
- nie pojawiają się losowe artefakty poza przewidzianymi folderami

## Epic 5. Web Tooling Through Ollama Cloud

Cel: dodać internet tylko tam, gdzie naprawdę potrzebny.

### Story 5.1

Zintegrować web search w agent flow.

Acceptance:

- cytowania źródeł są zwracane
- web search nie aktywuje się, jeśli nie jest potrzebny

### Story 5.2

Zintegrować URL fetch do kontekstu.

Acceptance:

- HTML zamieniany jest na markdown
- tekstowe strony są czytane bez artefaktów HTML

### Story 5.3

Dopisać politykę privacy/local-first dla web tools.

Acceptance:

- local-only flow nie odpala chmury
- user dostaje jawny sygnał, gdy aktywuje się cloud path

## Epic 6. UX Cleanup And Product Hardening

Cel: usunąć dług technologiczny widoczny użytkownikowi.

### Story 6.1

Usunąć legacy naming z głównych ścieżek UI.

Acceptance:

- user nie widzi “Copilot Plus” w głównym flow
- settings i widoki mówią językiem KOS2

### Story 6.2

Dostosować suggested prompts i entry copy do KOS.

Acceptance:

- plugin sugeruje workflowy KOS, nie generic assistant usage

### Story 6.3

Doprecyzować docs użytkownika i operatora.

Acceptance:

- istnieje install guide
- istnieje local/cloud setup guide
- istnieje troubleshooting dla Ollamy

## Epic 7. Quality Gates, Tests And Release Readiness

Cel: zbudować realny system jakości, nie tylko “build passes”.

### Story 7.1

Dodać unit tests dla najważniejszych adapterów i routingów.

Acceptance:

- provider, settings i routing mają testy jednostkowe

### Story 7.2

Dodać integration tests na fixture vault.

Acceptance:

- flows `organise`, `next-steps`, `decision`, `review` mają testy integracyjne

### Story 7.3

Dodać benchmark i performance gates.

Acceptance:

- istnieją skrypty benchmark
- wyniki są porównywalne między buildami

### Story 7.4

Przygotować local release checklist.

Acceptance:

- install w Obsidianie
- smoke lokalny
- smoke cloud
- manual acceptance checklist

## Epic 8. Document Ingest And YouTube Transcript

Cel: domknąć najcięższe capability na końcu, po stabilizacji rdzenia.

### Story 8.1

PDF ingest.

Acceptance:

- parser działa lokalnie lub przez jawny self-host path
- błędy są czytelne

### Story 8.2

EPUB i rich-doc ingest.

Acceptance:

- obsługiwane typy są jawnie określone
- unsupported types nie udają sukcesu

### Story 8.3

YouTube transcript flow.

Acceptance:

- działa przez wybrany provider
- ma fallback policy
- nie łamie privacy assumptions

### Story 8.4

Regression hardening po ingest/transcript.

Acceptance:

- wcześniejsze epiki nadal przechodzą smoke/integration/benchmark gates
