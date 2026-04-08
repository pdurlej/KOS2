#!/usr/bin/env bash
set -euo pipefail

LOCAL_OLLAMA_URL="${LOCAL_OLLAMA_URL:-http://127.0.0.1:11434}"
CHAT_MODEL="${KOS2_SMOKE_CHAT_MODEL:-}"
EMBED_MODEL="${KOS2_SMOKE_EMBED_MODEL:-}"
KEYCHAIN_SERVICE="${KOS2_OLLAMA_KEYCHAIN_SERVICE:-cos2-ollama-cloud}"
TAGS_JSON="/tmp/kos2-ollama-tags.json"
CHAT_JSON="/tmp/kos2-ollama-chat.json"
EMBED_JSON="/tmp/kos2-ollama-embed.json"

discover_models() {
  python3 - "$TAGS_JSON" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

seen = set()
for entry in payload.get("models", []):
    name = str(entry.get("name", "")).strip()
    if not name or name in seen:
        continue
    seen.add(name)
    print(name)
PY
}

probe_chat_model() {
  local model="$1"
  curl -fsS "$LOCAL_OLLAMA_URL/api/chat" \
    -H 'Content-Type: application/json' \
    -d "$(cat <<JSON
{"model":"$model","messages":[{"role":"user","content":"Reply with OK only."}],"stream":false,"options":{"num_predict":8}}
JSON
)" >"$CHAT_JSON"
}

probe_embedding_model() {
  local model="$1"
  curl -fsS "$LOCAL_OLLAMA_URL/api/embed" \
    -H 'Content-Type: application/json' \
    -d "$(cat <<JSON
{"model":"$model","input":"KOS2 smoke embedding check"}
JSON
)" >"$EMBED_JSON"
}

select_working_model() {
  local capability="$1"
  shift
  local models=("$@")
  local candidate=""

  for candidate in "${models[@]}"; do
    if [[ "$capability" == "chat" ]]; then
      if probe_chat_model "$candidate" >/dev/null 2>&1; then
        echo "$candidate"
        return 0
      fi
    else
      if probe_embedding_model "$candidate" >/dev/null 2>&1; then
        echo "$candidate"
        return 0
      fi
    fi
  done

  return 1
}

if [[ -z "${OLLAMA_API_KEY:-}" ]] && command -v security >/dev/null 2>&1; then
  OLLAMA_API_KEY="$(security find-generic-password -a "${USER:-}" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || true)"
fi

echo "[1/4] Checking local Ollama tags"
curl -fsS "$LOCAL_OLLAMA_URL/api/tags" >"$TAGS_JSON"
rg -q '"models"' "$TAGS_JSON"

AVAILABLE_MODELS=()
while IFS= read -r model_name; do
  AVAILABLE_MODELS+=("$model_name")
done < <(discover_models)
if [[ "${#AVAILABLE_MODELS[@]}" -eq 0 ]]; then
  echo "No models reported by local Ollama."
  exit 1
fi

if [[ -z "$CHAT_MODEL" ]]; then
  CHAT_MODEL="$(select_working_model "chat" "${AVAILABLE_MODELS[@]}")" || {
    echo "No chat-capable Ollama model found."
    exit 1
  }
fi

if [[ -z "$EMBED_MODEL" ]]; then
  EMBED_MODEL="$(select_working_model "embed" "${AVAILABLE_MODELS[@]}")" || {
    echo "No embedding-capable Ollama model found."
    exit 1
  }
fi

echo "[2/4] Checking local Ollama chat on $CHAT_MODEL"
probe_chat_model "$CHAT_MODEL"
rg -q '"message"' "$CHAT_JSON"

echo "[3/4] Checking local Ollama embeddings on $EMBED_MODEL"
probe_embedding_model "$EMBED_MODEL"
rg -q '"embeddings"' "$EMBED_JSON"

if [[ -n "${OLLAMA_API_KEY:-}" ]]; then
  echo "[4/4] Checking Ollama Cloud web search"
  curl -fsS "https://ollama.com/api/web_search" \
    -H "Authorization: Bearer $OLLAMA_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"query":"Ollama MLX Apple Silicon preview","max_results":3}' \
    >/tmp/kos2-ollama-cloud.json
  rg -q '"results"' /tmp/kos2-ollama-cloud.json
else
  echo "[4/4] Skipping Ollama Cloud web search: no key found in env or macOS Keychain"
fi

echo "KOS2 Ollama smoke passed"
