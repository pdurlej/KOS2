# KOS2 PRD

## 1. Cel produktu

KOS2 ma być natywną warstwą operacyjną KOS wewnątrz Obsidiana. Nie ma być ogólnym chatbotem do wszystkiego. Ma zamieniać workflowy KOS z warstwy komendowej na szybki, lokalny, przewidywalny plugin z kontrolą edycji, retrievalem vaulta i agent/tool orchestration.

Najkrótsza obietnica produktu:

`mam materiał lub pytanie -> KOS2 rozumie kontekst vaulta -> proponuje lub wykonuje właściwe działania -> zapisuje wynik w przewidywalny sposób`

## 2. Problem do rozwiązania

Obecny KOS jako zestaw komend:

- działa, ale wymaga wysokiego kosztu operacyjnego od użytkownika
- nie daje naturalnego UI do iteracji, retrievalu i podglądu zmian
- ma ograniczoną ergonomię dla działań wieloetapowych
- nie daje jednej spójnej powierzchni dla chat, vault QA, organising, decyzji i review

Soft fork `obsidian-copilot` rozwiązuje część problemu technicznego, ale wymaga przepięcia semantyki produktu z “AI copilot” na “KOS operating layer”.

## 3. Produktowe założenia nienegocjowalne

- nazwa produktu: `KOS2`
- host: community plugin dla Obsidiana
- strategia implementacji: soft fork z `obsidian-copilot`
- provider strategy: tylko `Ollama`
- wspierane tryby Ollamy:
  - lokalna / self-hosted Ollama
  - Ollama Cloud dla web tools
- brak własnego backendu aplikacyjnego
- priorytet: szybkość i przewidywalność
- prywatność: local-first, brak sekretów w vaultcie
- rust nie jest celem samym w sobie; może wejść później wyłącznie po profilowaniu

## 4. Persona i use cases

### 4.1 Główna persona

Operator KOS pracujący w Obsidianie, który:

- prowadzi projekty, obszary i zasoby w jednym vaultcie
- chce szybko porządkować materiał wejściowy
- potrzebuje stabilnych artefaktów: analysis, decision, outcome, moc
- chce lokalnych modeli i niskiej zależności od zewnętrznych usług

### 4.2 Drugorzędna persona

Power user Apple Silicon, który:

- ma lokalne modele w Ollamie
- oczekuje niskiej latencji
- jest gotowy używać Ollama Cloud tylko tam, gdzie potrzebny jest web

## 5. Job-to-be-done

- Gdy wrzucam materiał do vaulta, chcę go szybko uporządkować zgodnie z KOS.
- Gdy pytam o kontekst, chcę dostać odpowiedź opartą o vault, a nie hallucination-first.
- Gdy chcę przekształcić materiał w decyzję albo review, chcę mieć jawny i kontrolowalny flow.
- Gdy plugin proponuje edycję pliku, chcę zobaczyć preview zanim coś zapisze.
- Gdy potrzebuję informacji z internetu, chcę web tools bez budowania osobnego backendu.

## 6. Zakres V1

### 6.1 In scope

- instalowalny plugin `KOS2` działający obok oryginalnego pluginu
- lokalny chat przez Ollamę
- lokalne embeddingi przez Ollamę
- vault-aware retrieval
- edit/apply preview przed zapisem
- tryb `KOS2 Agent`
- URL fetch i web search przez Ollama Cloud tools
- podstawowe workflowy KOS:
  - organise
  - next-steps
  - decision
  - review
- lokalna pamięć/history flow zgodna z upstream bootstrapem tam, gdzie nie psuje semantyki KOS
- podstawowe settings UX pod Ollamę i KOS2
- smoke, integration i benchmark gates

### 6.2 Out of scope dla V1

- OpenRouter i inni providerzy
- własny backend KOS2
- public marketplace release gotowy marketingowo
- pełny rebrand całego upstreamu w kodzie wewnętrznym

### 6.3 Celowo przesunięte na końcową falę

- PDF ingest
- EPUB ingest
- rich-doc ingest (`docx`, `pptx`, `xlsx`, itp.)
- YouTube transcript

To ma być osobny, ostatni epic w planie implementacji.

## 7. Zakres V1.1 / hardening po V1

- pełny cleanup legacy naming w UI i docs
- lepsze dopasowanie promptów/system behavior do KOS
- twardsze performance tuning pod Apple Silicon
- bardziej rozbudowane benchmarki porównawcze modeli lokalnych

## 8. Funkcjonalności produktu

### 8.1 Core runtime

- uruchomienie pluginu w sidebar/editor
- wybór lokalnego modelu Ollama
- wybór embedding modelu
- działający chat i agent loop

### 8.2 Vault intelligence

- lokalne przeszukiwanie vaulta
- retrieval z uwzględnieniem struktury notatek KOS
- indeksowanie i reindeksowanie vaulta

### 8.3 KOS workflows

- `/organise`
  - intake materiału
  - routing do właściwego flow
  - nazwanie capability gap zamiast fake analysis
- `/next-steps`
  - lista realnego pending work
- `/decision`
  - tworzenie decyzji z analysis/evidence
- `/review`
  - domykanie loopu outcome

### 8.4 Write safety

- podgląd diffa przed zapisem
- brak silent overwrite
- możliwość manualnego zaakceptowania zmian

### 8.5 Web capabilities

- web search przez Ollama Cloud
- URL fetch/HTML to markdown
- cytowania źródeł w wynikach webowych

## 9. Wymagania niefunkcjonalne

### 9.1 Performance

- warm chat z lokalnym modelem powinien być odczuwalnie szybki na Apple Silicon
- embed i retrieval nie mogą blokować UI na długie okresy
- indexing powinien mieć jawny progress i być restartowalny
- funkcje webowe nie mogą psuć local-first flows

### 9.2 Security i privacy

- brak sekretów w vaultcie
- klucze tylko w settings zaszyfrowanych, env albo Keychain
- brak własnego backendu przechowującego dane użytkownika
- self-host/local mode nie może po cichu wysyłać danych do chmury

### 9.3 Reliability

- jawne błędy capability gap
- brak udawanych wyników dla nieobsługiwanych typów danych
- przewidywalny fallback, nie “magic”

## 10. Wymagania UX

- KOS2 ma wyglądać jak narzędzie operacyjne, nie landing page premium
- ustawienia mają jasno pokazywać:
  - local Ollama
  - optional Ollama Cloud
  - self-host/local services
- branding i copy mają wspierać workflowy KOS, nie “plus subscription”

## 11. Metryki sukcesu

### 11.1 Must-have

- plugin buduje się i uruchamia lokalnie
- local Ollama działa bez dodatkowego API key
- user może zadać pytanie o vault i dostać odpowiedź opartą o retrieval
- co najmniej jeden workflow KOS przechodzi end-to-end
- web search działa przez Ollama Cloud
- zmiany w plikach są previewowane przed zapisem

### 11.2 Performance gates

- smoke test local/chat/embed/cloud przechodzi
- benchmark warm response dla domyślnego modelu jest akceptowalny na M1 Max
- brak regresji build/runtime względem bootstrapu

## 12. Ryzyka produktowe

- upstream fork może zostawić zbyt dużo starej semantyki
- zbyt agresywne użycie agent loopu może obniżyć przewidywalność
- duże lokalne modele mogą dawać słabą ergonomię bez routera modeli
- ingest dokumentów może zdominować scope, jeśli wejdzie zbyt wcześnie

## 13. Kryteria akceptacji V1

- `KOS2` jest instalowalny jako osobny plugin
- domyślnie działa z lokalną Ollamą
- ma sensowny podstawowy UI i settings pod KOS2
- wspiera `organise`, `next-steps`, `decision`, `review` w pierwszej wersji
- wspiera URL/web search przez Ollama Cloud
- przechodzi zdefiniowane testy smoke, integration i benchmark
