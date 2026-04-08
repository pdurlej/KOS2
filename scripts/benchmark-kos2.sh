#!/usr/bin/env bash
set -euo pipefail

LOCAL_OLLAMA_URL="${LOCAL_OLLAMA_URL:-http://127.0.0.1:11434}"
CHAT_MODEL="${KOS2_BENCH_CHAT_MODEL:-SpeakLeash/bielik-7b-instruct-v0.1-gguf:Q5_K_M}"
EMBED_MODEL="${KOS2_BENCH_EMBED_MODEL:-bge-m3:latest}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

run_timed_request() {
  local url="$1"
  local body="$2"
  local output_file
  output_file="$(mktemp)"

  local time_total
  time_total="$(
    curl -fsS \
      -o "$output_file" \
      -w '%{time_total}' \
      -H 'Content-Type: application/json' \
      -d "$body" \
      "$url"
  )"

  if [[ ! -s "$output_file" ]]; then
    echo "Request to $url returned an empty response." >&2
    rm -f "$output_file"
    return 1
  fi

  rm -f "$output_file"
  printf '%s' "$time_total"
}

echo "Checking Ollama host: $LOCAL_OLLAMA_URL" >&2
curl -fsS "$LOCAL_OLLAMA_URL/api/tags" >/dev/null

echo "Measuring cold chat latency on $CHAT_MODEL" >&2
COLD_CHAT_LATENCY="$(
  run_timed_request \
    "$LOCAL_OLLAMA_URL/api/chat" \
    "{\"model\":\"$CHAT_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"stream\":false,\"options\":{\"num_predict\":16}}"
)"

echo "Measuring warm chat latency on $CHAT_MODEL" >&2
WARM_CHAT_LATENCY="$(
  run_timed_request \
    "$LOCAL_OLLAMA_URL/api/chat" \
    "{\"model\":\"$CHAT_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"stream\":false,\"options\":{\"num_predict\":16}}"
)"

echo "Measuring embedding latency on $EMBED_MODEL" >&2
EMBED_LATENCY="$(
  run_timed_request \
    "$LOCAL_OLLAMA_URL/api/embed" \
    "{\"model\":\"$EMBED_MODEL\",\"input\":\"KOS2 benchmark embedding probe\"}"
)"

echo "KOS2 benchmark complete: cold=${COLD_CHAT_LATENCY}s warm=${WARM_CHAT_LATENCY}s embed=${EMBED_LATENCY}s" >&2

cat <<JSON
{
  "timestamp": "$TIMESTAMP",
  "host": "$LOCAL_OLLAMA_URL",
  "chat_model": "$CHAT_MODEL",
  "embedding_model": "$EMBED_MODEL",
  "cold_chat_latency_s": $COLD_CHAT_LATENCY,
  "warm_chat_latency_s": $WARM_CHAT_LATENCY,
  "embed_latency_s": $EMBED_LATENCY
}
JSON
