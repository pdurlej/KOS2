# KOS2 Vault Fixture

Deterministyczny fixture vault dla `Milestone 0` i przyszłych testów integracyjnych workflowów KOS.

## Struktura

- `01_Inbox` - surowy intake do routingu `organise`
- `10_Projects` - aktywny projekt z analysis, decision, review i outcome
- `20_Areas` - notatki operacyjne powiązane z obszarem
- `30_Resources` - materiały referencyjne o runtime KOS2

## Założenia

- fixture ma wymusić traceability,
- fixture ma zawierać jawny `needs-review`,
- fixture unika danych losowych i niestabilnych.
