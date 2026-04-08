# KOS2 Manual Acceptance Checklist

## Cel

To jest ręczna checklista dla `Milestone 0`, `Milestone 1` i pierwszego wdrożenia `Milestone 2`. Służy do szybkiej walidacji runtime, settings, gates i workflow surface zanim zespół przejdzie do następnych stories.

## M0 Readiness

- [ ] `TODO.md` istnieje i odzwierciedla bieżący stan prac.
- [ ] `docs/bmad/15-implementation-readiness-kos2.md` zawiera aktualny status i blokery.
- [ ] `docs/bmad/17-workflow-contracts-kos2.md` opisuje kontrakty `organise`, `next-steps`, `decision`, `review`.
- [ ] `src/integration_tests/fixtures/kos2-vault/` zawiera:
  - [ ] `01_Inbox`
  - [ ] `10_Projects`
  - [ ] `20_Areas`
  - [ ] `30_Resources`
  - [ ] seeded analysis/decision/outcome notes
  - [ ] note oznaczoną `needs-review`
- [ ] `scripts/benchmark-kos2.sh` uruchamia minimalny pomiar i wypisuje JSON.

## M1 Runtime: Local-Only Path

- [ ] Plugin buduje się lokalnie.
- [ ] Domyślny chat model wskazuje na Ollamę.
- [ ] Domyślny embedding model wskazuje na Ollamę.
- [ ] Settings jasno pokazują, że local Ollama nie wymaga API key.
- [ ] Settings jasno pokazują, że Ollama Cloud jest opcjonalny i służy tylko do web tools.
- [ ] Brak Ollama Cloud key nie wygląda jak awaria całego runtime.
- [ ] Główne settings i onboarding nie mówią o zakupie, subskrypcji ani renew.

## M1 Runtime: Cloud-Ready Path

- [ ] `ollamaCloudApiKey` można zapisać w settings.
- [ ] `OLLAMA_API_KEY` jest rozpoznawany jako alternatywne źródło.
- [ ] macOS Keychain item `cos2-ollama-cloud` jest opisany jako fallback.
- [ ] Web search działa po skonfigurowaniu klucza.
- [ ] UI nadal jasno rozróżnia local runtime od optional cloud tools.

## M2 Workflow Surface

- [ ] Command palette pokazuje:
  - [ ] `KOS Workflow: Organise current note`
  - [ ] `KOS Workflow: Next steps from current note`
  - [ ] `KOS Workflow: Draft decision from current note`
  - [ ] `KOS Workflow: Draft review from current note`
- [ ] `organise` działa na aktywnej notatce i zwraca routing + recommended next step.
- [ ] `organise` na surowym intake nie generuje sztucznego decision/review draftu.
- [ ] `next-steps` zwraca realne pending items z path traceability.
- [ ] `decision` tworzy draft decision artifact tylko wtedy, gdy istnieje analysis/evidence context.
- [ ] `decision` odmawia, jeśli aktywna notatka nie ma podstaw do draftu.
- [ ] `review` tworzy draft review/outcome update tylko przy istniejącym decision/review/outcome context.
- [ ] `review` odmawia, jeśli aktywna notatka nie ma takiego kontekstu.
- [ ] Workflow modal pozwala skopiować wynik i nie zapisuje nic do vaulta bez jawnej akcji usera.

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
- krótki opis ręcznego przejścia przez settings i onboarding.
