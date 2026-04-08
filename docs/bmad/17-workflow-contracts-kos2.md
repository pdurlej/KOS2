# KOS2 Workflow Contracts

## Cel

Ten dokument zamyka kontrakty wejścia/wyjścia dla czterech workflowów V1, tak aby można było wejść w `bmad-bmm-dev-story` bez dopowiadania semantyki podczas implementacji.

## Invariants wspólne

- KOS2 działa local-first i używa vault context jako źródła prawdy.
- Workflow nie może udawać capability, której aktualny bootstrap nie ma.
- Brak cichego zapisu do plików. Każda krytyczna zmiana przechodzi przez preview/apply flow.
- Wynik musi zachować traceability do pliku, notatki albo fragmentu wejścia.
- Web tools są opcjonalne. Workflow nie może wymagać chmury do działania w local-only path.

## `organise`

### Input contract

- Wejście może być wskazanym plikiem, aktywną notatką albo surowym materiałem tekstowym.
- Workflow powinien przyjąć także kontekst vaulta do routingu, jeśli user nie wskazał jednej notatki.

### Processing contract

- Workflow wyciąga sygnały intake z notatki:
  - otwarte taski,
  - bullets,
  - zaznaczony fragment, jeśli user go podał.
- Workflow klasyfikuje materiał na sensowny kolejny krok KOS i może rankować kilka kandydatów trasy.
- Jeśli obecny bootstrap nie ma capability do pełnego wykonania flow, musi nazwać `capability gap`.
- Workflow nie generuje sztucznego decision/review draftu bez podstaw.
- Workflow może przygotować stabilizowany draft artefaktu do dalszej promocji, ale nie zapisuje go po cichu.

### Output contract

- Wynik zawiera:
  - rozpoznany typ wejścia,
  - intake signals,
  - proponowany routing,
  - ranked routes, jeśli istnieje więcej niż jedna sensowna ścieżka,
  - rekomendowany następny krok,
  - źródła/ścieżki, na których routing został oparty.
- Dla surowego intake workflow może zwrócić:
  - draft `analysis`,
  - draft `project`,
  - draft `area`,
  - draft `resource`.
- Jeśli brak capability:
  - wynik nazywa lukę,
  - wskazuje bezpieczny następny krok,
  - nie tworzy artefaktu na siłę.

## `next-steps`

### Input contract

- Wejście może wskazywać projekt, obszar, notatkę albo ogólne pytanie o pending work.
- Workflow może korzystać z retrieval nad vaultem, ale tylko z jawnych źródeł.

### Processing contract

- Workflow zbiera realne open loops, taski i blockers z notatek.
- Workflow zachowuje relację wynik -> źródło, zamiast tworzyć oderwaną listę z modelu.

### Output contract

- Wynik zawiera listę pending items.
- Każdy item zawiera traceability:
  - ścieżkę notatki,
  - sekcję, tag albo fragment wejścia, jeśli to dostępne.
- Jeśli nie ma wystarczających danych:
  - workflow mówi o braku podstaw,
  - proponuje gdzie uzupełnić kontekst.

## `decision`

### Input contract

- Wejście musi zawierać `analysis`, `evidence` albo istniejący kontekst decyzyjny w vaultcie.
- Workflow nie zaczyna od pustej spekulacji.

### Processing contract

- Workflow konsoliduje materiał wejściowy do decision artifact.
- Workflow zachowuje źródła i wskazuje zależności od istniejących notatek.

### Output contract

- Wynik to:
  - draft decision artifact do preview,
  - albo odmowa z czytelnym powodem.
- Draft decision artifact powinien zawierać:
  - temat decyzji,
  - stan/werdykt,
  - evidence,
  - konsekwencje lub dalsze kroki.
- Jeśli podstawy są niewystarczające:
  - workflow odmawia,
  - wskazuje czego brakuje.

## `review`

### Input contract

- Wejście zawiera istniejący decision/outcome context albo materiał do domknięcia review.
- Workflow może korzystać z retrieval, ale nie tworzy outcome bez podstaw.

### Processing contract

- Workflow sprawdza, czy istnieje materiał do zamknięcia pętli.
- Jeśli outcome lub review nie jest uzasadnione, workflow zgłasza brak podstaw.

### Output contract

- Wynik to:
  - draft review/outcome update do preview,
  - albo odmowa.
- Draft zawiera:
  - stan,
  - obserwacje,
  - brakujące follow-upy,
  - powiązanie z decision/outcome source.

## Powiązanie z fixture i testami

- Fixture vault dla tych workflowów znajduje się w `src/integration_tests/fixtures/kos2-vault/`.
- Testy integracyjne dla workflowów powinny walidować:
  - traceability,
  - refusal/capability-gap behavior,
  - brak cichych zapisów,
  - przewidywalny output contract,
  - ranked routing i draft artifact preview dla `organise`.
